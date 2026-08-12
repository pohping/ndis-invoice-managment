import BigNumber from 'bignumber.js';
import { NotFoundError, ValidationError } from '@/lib/errors';
import * as invoiceRepo from '@/repositories/invoice.repository';
import { getClient } from '@/repositories/client.repository';
import {
   createInvoiceSchema,
   draftedInvoiceSchema,
} from '@/modules/invoice/invoice.schema';
import { toValidationError } from '@/lib/zod-errors';
import { InvoiceItem } from '@/types';
import { db } from '@/lib/db';

function round2(value: BigNumber.Value): string {
   return new BigNumber(value)
      .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
      .toFixed(2);
}

export async function listInvoices(page: number, pageSize: number) {
   const { rows, total } = await invoiceRepo.listInvoices({ page, pageSize });

   // normalize provider and client label
   const normalizedRow = rows.map(
      ({
         provider_name,
         provider_abn,
         client_first_name,
         client_last_name,
         client_ndis_number,
         ...rest
      }) => ({
         ...rest,
         client_label: rest.client_id
            ? `${client_first_name} ${client_last_name} (${client_ndis_number})`
            : undefined,
         provider_label: rest.provider_id
            ? `${provider_name} (${provider_abn})`
            : undefined,
      }),
   );

   return { rows: normalizedRow, total };
}

export async function getInvoiceWithItems(id: number) {
   return invoiceRepo.getInvoiceWithItems(id);
}

export async function getInvoiceItemRateSetMatches(
   startDate: string,
   endDate: string,
) {
   const start = new Date(startDate);
   const end = endDate ? new Date(endDate) : new Date('9999-12-31');

   // validate date range
   if (start > end) {
      throw new ValidationError(
         'Service End Date must be on or after Service Start Date',
      );
   }

   const matches = await invoiceRepo.findOverlappingRateSets(start, end);
   // no rate set found within date range
   if (matches.length === 0) {
      throw new ValidationError(
         'No rate set found for the selected date range',
      );
   }

   // date range contains mutiple rate set
   if (matches.length > 1) {
      throw new ValidationError(
         `Multiple rate sets match the selected date range. ${matches.map((rateSet) => `(${rateSet.start_date.toLocaleDateString('en-GB')} - ${rateSet.end_date?.toLocaleDateString('en-GB')})`).join(', ')}`,
      );
   }

   return matches[0];
}

export async function getInvoiceItemMaxRate(params: {
   supportItemId: number;
   rateSetId: number;
   clientId: number;
   startDate: Date;
   endDate: Date;
}) {
   const client = await getClient(params.clientId);
   if (!client) throw new NotFoundError('Client not found');

   const price = await invoiceRepo.findBestMatchingPrice({
      rateSetId: params.rateSetId,
      supportItemId: params.supportItemId,
      pricingRegion: client.pricing_region,
      itemStart: params.startDate,
      itemEnd: params.endDate,
   });

   return {
      max_rate: price?.unit_price ? round2(price.unit_price) : null,
   };
}

export async function resolveItemPricing(
   item: InvoiceItem,
   clientPricingRegion: string | null,
): Promise<{
   rate_set_id: number | null;
   max_rate: string | null;
   matchError?: string;
}> {
   if (!item.start_date || !item.end_date) {
      return { rate_set_id: item.rate_set_id ?? null, max_rate: null };
   }

   const start = new Date(item.start_date);
   const end = new Date(item.end_date);

   let rateSetId = item.rate_set_id ?? null;

   if (!rateSetId) {
      const overlapping = await invoiceRepo.findOverlappingRateSets(start, end);
      if (overlapping.length === 1) {
         rateSetId = overlapping[0].id;
      } else if (overlapping.length > 1) {
         return {
            rate_set_id: null,
            max_rate: null,
            matchError: 'Multiple rate sets match this date range.',
         };
      } else {
         return { rate_set_id: null, max_rate: null };
      }
   }

   if (!item.support_item_id || !clientPricingRegion || !rateSetId) {
      return { rate_set_id: rateSetId, max_rate: null };
   }

   const price = await invoiceRepo.findBestMatchingPrice({
      rateSetId,
      supportItemId: item.support_item_id,
      pricingRegion: clientPricingRegion,
      itemStart: start,
      itemEnd: end,
   });

   return {
      rate_set_id: rateSetId,
      max_rate: price?.unit_price ? round2(price.unit_price) : null,
   };
}

async function buildResolvedItems(
   items: InvoiceItem[],
   clientId: number,
   isDraft: boolean,
) {
   const client = clientId
      ? await db
           .selectFrom('client')
           .select(['pricing_region'])
           .where('id', '=', clientId)
           .executeTakeFirst()
      : undefined;

   const resolved: Array<
      InvoiceItem & { max_rate: string | null; amount: string | null }
   > = [];

   for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const { rate_set_id, max_rate, matchError } = await resolveItemPricing(
         item,
         client?.pricing_region ?? null,
      );
      if (!isDraft && matchError)
         throw new ValidationError(
            'Could not determine a matching NDIS price for this item.',
            { [`items[${i}]`]: [matchError] },
         );

      const unit = item.unit ? new BigNumber(item.unit) : null;
      const inputRate = item.input_rate ? new BigNumber(item.input_rate) : null;
      const amount =
         unit && inputRate ? round2(unit.multipliedBy(inputRate)) : null;

      resolved.push({ ...item, rate_set_id, max_rate, amount });
   }

   return resolved;
}

export async function saveInvoice(payload: any) {
   const isDraft = payload.status === 'drafted';

   if (isDraft) {
      const { success, error } = draftedInvoiceSchema.safeParse(payload);
      if (!success) {
         throw toValidationError(error);
      }
   } else {
      const { success, error } = createInvoiceSchema.safeParse(payload);
      if (!success) {
         throw toValidationError(error);
      }
   }

   const duplicate = await invoiceRepo.findInvoiceByNumberAndProvider(
      payload.invoice_number,
      payload.provider_id,
   );
   if (duplicate && payload.id !== duplicate.id) {
      throw new ValidationError(
         'Invoice number already exists for this provider.',
      );
   }

   const resolved = await buildResolvedItems(
      payload.items,
      payload.client_id,
      isDraft,
   );
   const totalAmount = resolved.reduce(
      (sum, item) => sum.plus(item.amount ?? 0),
      new BigNumber(0),
   );
   if (!isDraft) {
      const expected = new BigNumber(payload.expected_amount ?? 0);
      if (!expected.eq(totalAmount)) {
         throw new ValidationError(
            'Expected amount must equal the sum of invoice item amounts.',
         );
      }
   }

   const result = payload.id
      ? await invoiceRepo.updateInvoiceWithItems(payload.id, payload)
      : await invoiceRepo.createInvoiceWithItems(payload);

   if (!result) throw new NotFoundError('Invoice');

   return result;
}

export async function deleteInvoice(id: number) {
   const deleted = await invoiceRepo.softDeleteInvoice(id);

   if (!deleted) throw new NotFoundError('Invoice not found').cause;

   return deleted;
}
