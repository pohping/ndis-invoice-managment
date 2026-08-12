import { db } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import * as XLSX from 'xlsx';

/**
 * Column mapping per assessment spec (ndis_excel_import_logic.sql)
 */
const COLUMNS = {
   ITEM_NUMBER: 'A',
   ITEM_NAME: 'B',
   CATEGORY_NUMBER: 'F',
   CATEGORY_NAME: 'H',
   UNIT: 'I',
   IS_QUOTE_REQUIRED: 'J',
   START_DATE: 'K',
   END_DATE: 'L',
   ACT: 'M',
   NSW: 'N',
   NT: 'O',
   QLD: 'P',
   SA: 'Q',
   TAS: 'R',
   VIC: 'S',
   WA: 'T',
   REMOTE: 'U',
   VERY_REMOTE: 'V',
   IS_NF2F_SUPPORT_PROVISION: 'W',
   IS_PROVIDER_TRAVEL: 'X',
   IS_SHORT_NOTICE_CANCEL: 'Y',
   IS_NDIA_REQUESTED_REPORTS: 'Z',
   IS_IRREGULAR_SIL_SUPPORTS: 'AA',
   SUPPORT_TYPE: 'AB',
} as const;

// Column -> fixed attribute code (label comes from the header cell at runtime)
const ATTRIBUTE_COLUMNS: Array<{ column: string; code: string }> = [
   { column: COLUMNS.IS_QUOTE_REQUIRED, code: 'IS_QUOTE_REQUIRED' },
   {
      column: COLUMNS.IS_NF2F_SUPPORT_PROVISION,
      code: 'IS_NF2F_SUPPORT_PROVISION',
   },
   { column: COLUMNS.IS_PROVIDER_TRAVEL, code: 'IS_PROVIDER_TRAVEL' },
   { column: COLUMNS.IS_SHORT_NOTICE_CANCEL, code: 'IS_SHORT_NOTICE_CANCEL' },
   {
      column: COLUMNS.IS_NDIA_REQUESTED_REPORTS,
      code: 'IS_NDIA_REQUESTED_REPORTS',
   },
   {
      column: COLUMNS.IS_IRREGULAR_SIL_SUPPORTS,
      code: 'IS_IRREGULAR_SIL_SUPPORTS',
   },
];

// Column -> fixed full_label (code/label come from the header cell at runtime)
const PRICING_REGION_COLUMNS: Array<{ column: string; fullLabel: string }> = [
   { column: COLUMNS.ACT, fullLabel: 'Australian Capital Territory' },
   { column: COLUMNS.NSW, fullLabel: 'New South Wales' },
   { column: COLUMNS.NT, fullLabel: 'Northern Territory' },
   { column: COLUMNS.QLD, fullLabel: 'Queensland' },
   { column: COLUMNS.SA, fullLabel: 'South Australia' },
   { column: COLUMNS.TAS, fullLabel: 'Tasmania' },
   { column: COLUMNS.VIC, fullLabel: 'Victoria' },
   { column: COLUMNS.WA, fullLabel: 'Western Australia' },
   { column: COLUMNS.REMOTE, fullLabel: 'Remote' },
   { column: COLUMNS.VERY_REMOTE, fullLabel: 'Very Remote' },
];

type ColumnKeys = (typeof COLUMNS)[keyof typeof COLUMNS];

interface ParsedRow {
   itemNumber: string;
   itemName: string;
   categoryNumber: string;
   categoryName: string;
   unit: string;
   startDate: string;
   endDate: string | null;
   supportTypeLabel: string | null; // raw Column AB cell value for this row
   attributes: Record<string, boolean>;
   prices: Record<string, number | null>;
}

function createRowReader(row: Record<string, unknown>) {
   return {
      string: (column: string) => String(row[column] ?? '').trim(),
      value: (column: string) => row[column],
   };
}

function toIsoString(cellValue: unknown): string | null {
   const dateStr = String(cellValue || '');
   if (!/^\d{8}$/.test(dateStr)) return null;
   if (dateStr === '99991231') return null; // NDIS's "infinite" end-date sentinel

   const year = parseInt(dateStr.substring(0, 4), 10);
   const month = parseInt(dateStr.substring(4, 6), 10) - 1;
   const day = parseInt(dateStr.substring(6, 8), 10);

   const date = new Date(year, month, day);
   const isValidDate =
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day;
   if (!isValidDate) return null;

   return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

function toYesNoBoolean(value: unknown): boolean {
   if (typeof value !== 'string') return false;
   return /^y(es)?$/i.test(value.trim());
}

/**
 * Formats a DB timestamptz (returned as a JS Date) to the same YYYY-MM-DD
 */
function toIsoDate(date: Date): string {
   return date.toISOString().slice(0, 10);
}

/**
 * Shared "SCREAMING_SNAKE_CASE" derivation rule used by the spec
 */
function toCode(label: string): string {
   return label.trim().toUpperCase().replace(/\s+/g, '_');
}

interface WorkbookParseResult {
   rows: ParsedRow[];
   headerRow: Record<string, unknown>;
}

/**
 * Parses every worksheet in the workbook into normalised rows
 */
function parseWorkbook(buffer: Buffer): WorkbookParseResult {
   const workbook = XLSX.read(buffer);
   const rows: ParsedRow[] = [];
   const seen = new Set<string>(); // `${itemNumber}::${categoryNumber}::${startDate}::${endDate}`
   let headerRow: Record<string, unknown> | null = null;

   for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const allRows: Record<ColumnKeys, unknown>[] = XLSX.utils.sheet_to_json(
         sheet,
         {
            header: 'A',
            defval: null,
         },
      );
      if (allRows.length === 0) continue;

      if (!headerRow) headerRow = allRows[0]; // capture once, from the first non-empty sheet
      const dataRows = allRows.slice(1);

      for (const raw of dataRows) {
         const reader = createRowReader(raw);
         const itemNumber = reader.string(COLUMNS.ITEM_NUMBER);
         if (!itemNumber) continue; // skip blank/footer rows

         const categoryNumber = reader.string(COLUMNS.CATEGORY_NUMBER);
         const startDate = toIsoString(reader.value(COLUMNS.START_DATE));
         const endDate = toIsoString(reader.value(COLUMNS.END_DATE));

         if (!startDate) continue; // start_date is NOT NULL downstream; unparsable rows can't be imported

         const dedupeKey = `${itemNumber}::${categoryNumber}::${startDate}::${endDate ?? ''}`;
         if (seen.has(dedupeKey)) continue;
         seen.add(dedupeKey);

         const attributes: Record<string, boolean> = {};
         for (const { column, code } of ATTRIBUTE_COLUMNS) {
            attributes[code] = toYesNoBoolean(reader.value(column));
         }

         const prices: Record<string, number | null> = {};
         for (const { column } of PRICING_REGION_COLUMNS) {
            const value = reader.value(column);
            prices[column] =
               value === null || value === '' ? null : Number(value);
         }

         const supportTypeLabel = reader.string(COLUMNS.SUPPORT_TYPE) || null;

         rows.push({
            itemNumber,
            itemName: reader.string(COLUMNS.ITEM_NAME),
            categoryNumber,
            categoryName: reader.string(COLUMNS.CATEGORY_NAME),
            unit: reader.string(COLUMNS.UNIT),
            startDate,
            endDate,
            supportTypeLabel,
            attributes,
            prices, // keyed by column letter here; mapped to region code during import
         });
      }
   }

   return { rows, headerRow: headerRow ?? {} };
}

export interface ImportSummary {
   categoriesCreated: number;
   categoriesUpdated: number;
   categoriesDeactivated: number;
   itemsCreated: number;
   itemsUpdated: number;
   itemsDeactivated: number;
   pricesCreated: number;
   pricesUpdated: number;
   pricesRemoved: number;
}

/**
 * Idempotently imports a parsed NDIS pricing workbook into an existing rate_set
 */
export async function importRateSetExcel(rateSetId: number, file: File) {
   const rateSet = await db
      .selectFrom('rate_set')
      .selectAll()
      .where('id', '=', rateSetId)
      .executeTakeFirst();

   if (!rateSet) throw new NotFoundError('Rate set not found.');

   const buffer = Buffer.from(await file.arrayBuffer());
   const { rows, headerRow } = parseWorkbook(buffer);
   const headerReader = createRowReader(headerRow);

   const summary: ImportSummary = {
      categoriesCreated: 0,
      categoriesUpdated: 0,
      categoriesDeactivated: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeactivated: 0,
      pricesCreated: 0,
      pricesUpdated: 0,
      pricesRemoved: 0,
   };

   await db.transaction().execute(async (trx) => {
      /* ------------------- Pricing regions (global reference data) ------------------ */
      const regionCodeByColumn = new Map<string, string>();
      for (const { column, fullLabel } of PRICING_REGION_COLUMNS) {
         const label = headerReader.string(column);
         if (!label) continue; // header missing this column in this file; skip gracefully
         const code = toCode(label);
         regionCodeByColumn.set(column, code);

         const existing = await trx
            .selectFrom('rate_set_support_item_pricing_region')
            .selectAll()
            .where('code', '=', code)
            .executeTakeFirst();

         if (existing) {
            if (existing.label !== label || existing.full_label !== fullLabel) {
               await trx
                  .updateTable('rate_set_support_item_pricing_region')
                  .set({ label, full_label: fullLabel })
                  .where('code', '=', code)
                  .execute();
            }
         } else {
            await trx
               .insertInto('rate_set_support_item_pricing_region')
               .values({ code, label, full_label: fullLabel })
               .execute();
         }
      }

      /* ------------------- Attribute types (global reference data) ------------------ */
      for (const { column, code } of ATTRIBUTE_COLUMNS) {
         const label = headerReader.string(column);
         if (!label) continue;

         const existing = await trx
            .selectFrom('rate_set_support_item_attribute_type')
            .selectAll()
            .where('code', '=', code)
            .executeTakeFirst();

         if (existing) {
            if (existing.label !== label) {
               await trx
                  .updateTable('rate_set_support_item_attribute_type')
                  .set({ label })
                  .where('code', '=', code)
                  .execute();
            }
         } else {
            await trx
               .insertInto('rate_set_support_item_attribute_type')
               .values({ code, label })
               .execute();
         }
      }

      /* --------------- Support item types (global reference data, from Column AB) --- */
      const typeIdByCode = new Map<string, number>();
      const distinctTypeLabels = new Map<string, string>(); // code -> label
      for (const row of rows) {
         if (!row.supportTypeLabel) continue;
         distinctTypeLabels.set(
            toCode(row.supportTypeLabel),
            row.supportTypeLabel,
         );
      }

      for (const [code, label] of distinctTypeLabels) {
         const existing = await trx
            .selectFrom('rate_set_support_item_type')
            .selectAll()
            .where('code', '=', code)
            .executeTakeFirst();

         if (existing) {
            typeIdByCode.set(code, existing.id);
            if (existing.label !== label) {
               await trx
                  .updateTable('rate_set_support_item_type')
                  .set({ label })
                  .where('id', '=', existing.id)
                  .execute();
            }
         } else {
            const created = await trx
               .insertInto('rate_set_support_item_type')
               .values({ code, label })
               .returningAll()
               .executeTakeFirstOrThrow();
            typeIdByCode.set(code, created.id);
         }
      }

      /* ------------------------------- Categories ------------------------------- */
      const seenCategoryNumbers = new Set<string>();
      const seenItemKeys = new Set<string>(); // `${categoryNumber}::${itemNumber}`
      // `${support_item_id}::${type_id ?? 'null'}::${pricing_region_code}::${start_date}::${end_date ?? ''}`
      const seenPriceKeys = new Set<string>();

      const categoryByNumber = new Map<string, { id: number }>();
      const distinctCategories = new Map<string, string>();
      for (const row of rows)
         distinctCategories.set(row.categoryNumber, row.categoryName);

      let sortIdx = 1;
      for (const [categoryNumber, categoryName] of [
         ...distinctCategories.entries(),
      ].sort((a, b) =>
         a[0].localeCompare(b[0], undefined, { numeric: true }),
      )) {
         seenCategoryNumbers.add(categoryNumber);
         const existing = await trx
            .selectFrom('rate_set_category')
            .selectAll()
            .where('rate_set_id', '=', rateSetId)
            .where('category_number', '=', categoryNumber)
            .executeTakeFirst();

         if (existing) {
            if (
               existing.category_name !== categoryName ||
               existing.deleted_at ||
               existing.deactivated_at
            ) {
               await trx
                  .updateTable('rate_set_category')
                  .set({
                     category_name: categoryName,
                     sorting: sortIdx,
                     deleted_at: null,
                     deactivated_at: null,
                     updated_at: new Date(),
                  })
                  .where('id', '=', existing.id)
                  .execute();
               summary.categoriesUpdated++;
            }
            categoryByNumber.set(categoryNumber, { id: existing.id });
         } else {
            const created = await trx
               .insertInto('rate_set_category')
               .values({
                  rate_set_id: rateSetId,
                  category_number: categoryNumber,
                  category_name: categoryName,
                  sorting: sortIdx,
               })
               .returningAll()
               .executeTakeFirstOrThrow();
            categoryByNumber.set(categoryNumber, { id: created.id });
            summary.categoriesCreated++;
         }
         sortIdx++;
      }

      const allCategories = await trx
         .selectFrom('rate_set_category')
         .selectAll()
         .where('rate_set_id', '=', rateSetId)
         .where('deleted_at', 'is', null)
         .execute();
      for (const cat of allCategories) {
         if (!seenCategoryNumbers.has(cat.category_number)) {
            await trx
               .updateTable('rate_set_category')
               .set({ deactivated_at: new Date() })
               .where('id', '=', cat.id)
               .execute();
            summary.categoriesDeactivated++;
         }
      }

      /* ------------------------------ Support items ------------------------------ */
      let itemSort = 1;
      for (const row of rows) {
         const key = `${row.categoryNumber}::${row.itemNumber}`;
         if (seenItemKeys.has(key)) continue; // dedupe within this import
         seenItemKeys.add(key);

         const categoryId = categoryByNumber.get(row.categoryNumber)!.id;

         const existing = await trx
            .selectFrom('rate_set_support_item')
            .selectAll()
            .where('rate_set_id', '=', rateSetId)
            .where('category_id', '=', categoryId)
            .where('item_number', '=', row.itemNumber)
            .executeTakeFirst();

         let itemId: number;
         if (existing) {
            const changed =
               existing.item_name !== row.itemName ||
               existing.unit !== row.unit ||
               existing.deleted_at ||
               existing.deactivated_at;
            if (changed) {
               await trx
                  .updateTable('rate_set_support_item')
                  .set({
                     item_name: row.itemName,
                     unit: row.unit,
                     sorting: itemSort,
                     deleted_at: null,
                     deactivated_at: null,
                     updated_at: new Date(),
                  })
                  .where('id', '=', existing.id)
                  .execute();
               summary.itemsUpdated++;
            }
            itemId = existing.id;
         } else {
            const created = await trx
               .insertInto('rate_set_support_item')
               .values({
                  rate_set_id: rateSetId,
                  category_id: categoryId,
                  item_number: row.itemNumber,
                  item_name: row.itemName,
                  unit: row.unit,
                  sorting: itemSort,
               })
               .returningAll()
               .executeTakeFirstOrThrow();
            itemId = created.id;
            summary.itemsCreated++;
         }
         itemSort++;

         // Attributes (upsert boolean flags)
         for (const [attrCode, value] of Object.entries(row.attributes)) {
            const existingAttr = await trx
               .selectFrom('rate_set_support_item_attribute')
               .selectAll()
               .where('support_item_id', '=', itemId)
               .where('attribute_code', '=', attrCode)
               .executeTakeFirst();

            if (existingAttr) {
               if (existingAttr.value !== value) {
                  await trx
                     .updateTable('rate_set_support_item_attribute')
                     .set({ value })
                     .where('id', '=', existingAttr.id)
                     .execute();
               }
            } else {
               await trx
                  .insertInto('rate_set_support_item_attribute')
                  .values({
                     support_item_id: itemId,
                     attribute_code: attrCode,
                     value,
                  })
                  .execute();
            }
         }

         const typeId = row.supportTypeLabel
            ? (typeIdByCode.get(toCode(row.supportTypeLabel)) ?? null)
            : null;

         // Prices per pricing region
         for (const [column, unitPrice] of Object.entries(row.prices)) {
            if (unitPrice === null) continue;

            const regionCode = regionCodeByColumn.get(column);
            if (!regionCode) continue; // header didn't resolve a code for this column; skip

            const roundedPrice = unitPrice.toFixed(4); // schema: numeric(24,4)

            const priceKey = `${itemId}::${typeId ?? 'null'}::${regionCode}::${row.startDate}::${row.endDate ?? ''}`;
            seenPriceKeys.add(priceKey);

            const existingPrice = await trx
               .selectFrom('rate_set_support_item_price')
               .selectAll()
               .where('rate_set_id', '=', rateSetId)
               .where('support_item_id', '=', itemId)
               .where('pricing_region_code', '=', regionCode)
               .where('type_id', typeId === null ? 'is' : '=', typeId)
               .where('start_date', '=', new Date(row.startDate))
               .where(
                  'end_date',
                  row.endDate ? '=' : 'is',
                  row.endDate ? new Date(row.endDate) : null,
               )
               .executeTakeFirst();

            if (existingPrice) {
               if (Number(existingPrice.unit_price) !== Number(roundedPrice)) {
                  await trx
                     .updateTable('rate_set_support_item_price')
                     .set({ unit_price: roundedPrice, updated_at: new Date() })
                     .where('id', '=', existingPrice.id)
                     .execute();
                  summary.pricesUpdated++;
               }
            } else {
               await trx
                  .insertInto('rate_set_support_item_price')
                  .values({
                     rate_set_id: rateSetId,
                     support_item_id: itemId,
                     type_id: typeId,
                     pricing_region_code: regionCode,
                     unit_price: roundedPrice,
                     start_date: row.startDate,
                     end_date: row.endDate,
                  })
                  .execute();
               summary.pricesCreated++;
            }
         }
      }

      // Deactivate support items missing from the file
      const allItems = await trx
         .selectFrom('rate_set_support_item')
         .selectAll()
         .where('rate_set_id', '=', rateSetId)
         .where('deleted_at', 'is', null)
         .execute();
      for (const item of allItems) {
         const category = allCategories.find((c) => c.id === item.category_id);
         const key = `${category?.category_number}::${item.item_number}`;
         if (!seenItemKeys.has(key)) {
            await trx
               .updateTable('rate_set_support_item')
               .set({ deactivated_at: new Date() })
               .where('id', '=', item.id)
               .execute();
            summary.itemsDeactivated++;
         }
      }
      // Remove prices missing from the file.
      const allPrices = await trx
         .selectFrom('rate_set_support_item_price')
         .selectAll()
         .where('rate_set_id', '=', rateSetId)
         .execute();

      for (const price of allPrices) {
         const key = [
            price.support_item_id,
            price.type_id ?? 'null',
            price.pricing_region_code,
            toIsoDate(price.start_date),
            price.end_date ? toIsoDate(price.end_date) : '',
         ].join('::');

         if (!seenPriceKeys.has(key)) {
            await trx
               .deleteFrom('rate_set_support_item_price')
               .where('id', '=', price.id)
               .execute();
            summary.pricesRemoved++;
         }
      }
   });

   return summary;
}
