import { sql } from 'kysely';
import { db } from '@/lib/db';
import { InvoiceInput } from '@/modules/invoice/invoice.schema';

const baseSelect = () =>
   db.selectFrom('invoice').where('invoice.deleted_at', 'is', null);

export async function listInvoices(params: { page: number; pageSize: number }) {
   let query = baseSelect();

   const [rows, totalRow] = await Promise.all([
      query
         .leftJoin('client', 'client.id', 'invoice.client_id')
         .leftJoin('provider', 'provider.id', 'invoice.provider_id')
         .selectAll('invoice')
         .select([
            'provider.name as provider_name',
            'provider.abn as provider_abn',
            'client.first_name as client_first_name',
            'client.last_name as client_last_name',
            'client.ndis_number as client_ndis_number',
         ])
         .orderBy('invoice.invoice_date', 'desc')
         .limit(params.pageSize)
         .offset((params.page - 1) * params.pageSize)
         .execute(),
      query
         .select(db.fn.countAll<string>().as('count'))
         .executeTakeFirstOrThrow(),
   ]);

   return { rows, total: Number(totalRow.count) };
}

export async function findOverlappingRateSets(startDate: Date, endDate: Date) {
   return db
      .selectFrom('rate_set')
      .selectAll()
      .where('deleted_at', 'is', null)
      .where('deactivated_at', 'is', null)
      .where('start_date', '<=', endDate ?? new Date('9999-12-31'))
      .where((eb) =>
         eb.or([eb('end_date', 'is', null), eb('end_date', '>=', startDate)]),
      )
      .execute();
}

export async function getInvoiceWithItems(id: number) {
   const invoice = await baseSelect()
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
   if (!invoice) return null;

   const items = await db
      .selectFrom('invoice_item')
      .selectAll()
      .where('invoice_id', '=', id)
      .where('deleted_at', 'is', null)
      .orderBy('sort_order', 'asc')
      .execute();

   return { invoice, items };
}

export async function findBestMatchingPrice(params: {
   rateSetId: number;
   supportItemId: number;
   pricingRegion: string;
   itemStart: Date;
   itemEnd: Date;
}) {
   return db
      .selectFrom('rate_set_support_item_price')
      .selectAll()
      .where('rate_set_id', '=', params.rateSetId)
      .where('support_item_id', '=', params.supportItemId)
      .where('pricing_region_code', '=', params.pricingRegion)
      .where('start_date', '<=', params.itemEnd)
      .where((eb) =>
         eb.or([
            eb('end_date', 'is', null),
            eb('end_date', '>=', params.itemStart),
         ]),
      )
      .orderBy('start_date', 'desc')
      .orderBy(sql`end_date is null`, 'asc') // finite end_dates ranked before open-ended
      .orderBy('end_date', 'desc')
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst();
}

export async function findInvoiceByNumberAndProvider(
   invoiceNumber: string,
   providerId: number | null,
) {
   if (providerId === null) return undefined;
   return baseSelect()
      .selectAll()
      .where('invoice_number', '=', invoiceNumber)
      .where('provider_id', '=', providerId)
      .executeTakeFirst();
}

export async function createInvoiceWithItems(input: InvoiceInput) {
   return db.transaction().execute(async (trx) => {
      const totalAmount = input.items.reduce(
         (sum, item) => sum + Number(item.amount ?? 0),
         0,
      );

      const invoice = await trx
         .insertInto('invoice')
         .values({
            client_id: input.client_id ?? null,
            provider_id: input.provider_id ?? null,
            invoice_number: input.invoice_number,
            invoice_date: input.invoice_date ?? null,
            expected_amount: input.expected_amount ?? null,
            amount: totalAmount ? totalAmount.toFixed(2) : null,
            status: input.status,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      if (input.items.length > 0) {
         await trx
            .insertInto('invoice_item')
            .values(
               input.items.map((item, idx) => ({
                  invoice_id: invoice.id,
                  rate_set_id: item.rate_set_id ?? null,
                  category_id: item.category_id ?? null,
                  support_item_id: item.support_item_id ?? null,
                  start_date: item.start_date ?? null,
                  end_date: item.end_date ?? null,
                  max_rate: item.max_rate ?? null,
                  unit: item.unit ?? null,
                  input_rate: item.input_rate ?? null,
                  amount: item.amount ?? null,
                  sort_order: idx,
               })),
            )
            .execute();
      }

      const items = await trx
         .selectFrom('invoice_item')
         .selectAll()
         .where('invoice_id', '=', invoice.id)
         .where('deleted_at', 'is', null)
         .orderBy('sort_order', 'asc')
         .execute();

      return { invoice, items };
   });
}

export async function updateInvoiceWithItems(id: number, input: InvoiceInput) {
   return db.transaction().execute(async (trx) => {
      const totalAmount = input.items?.reduce(
         (sum, item) => sum + Number(item.amount ?? 0),
         0,
      );

      await trx
         .updateTable('invoice')
         .set({
            client_id: input.client_id ?? null,
            provider_id: input.provider_id ?? null,
            invoice_number: input.invoice_number,
            invoice_date: input.invoice_date ?? null,
            expected_amount: input.expected_amount ?? null,
            amount: totalAmount ? totalAmount.toFixed(2) : null,
            status: input.status,
            updated_at: new Date(),
         })
         .where('id', '=', id)
         .where('deleted_at', 'is', null)
         .execute();

      await trx
         .updateTable('invoice_item')
         .set({ deleted_at: new Date() })
         .where('invoice_id', '=', id)
         .execute();

      if (input.items.length > 0) {
         await trx
            .insertInto('invoice_item')
            .values(
               input.items.map((item, idx) => ({
                  invoice_id: id,
                  rate_set_id: item.rate_set_id ?? null,
                  category_id: item.category_id ?? null,
                  support_item_id: item.support_item_id ?? null,
                  start_date: item.start_date ?? null,
                  end_date: item.end_date ?? null,
                  max_rate: item.max_rate ?? null,
                  unit: item.unit ?? null,
                  input_rate: item.input_rate ?? null,
                  amount: item.amount ?? null,
                  sort_order: idx,
               })),
            )
            .execute();
      }

      return getInvoiceWithItems(id);
   });
}

export async function softDeleteInvoice(id: number) {
   return db
      .updateTable('invoice')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
}
