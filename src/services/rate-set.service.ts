import { NotFoundError, ValidationError } from '@/lib/errors';
import * as repo from '@/repositories/rate-set.repository';
import { importRateSetExcel } from './excel-import.service';
import {
   createRateSetSchema,
   updateRateSetSchema,
} from '@/modules/rate-set/rate-set.schema';
import { toValidationError } from '@/lib/zod-errors';

export async function listRateSets(page: number, pageSize: number) {
   return repo.listRateSets({ page, pageSize });
}

export async function getRateSet(id: number) {
   const rateSet = await repo.getRateSetById(id);
   if (!rateSet) throw new NotFoundError('Rate set');
   return rateSet;
}

export async function createRateSet(payload: any) {
   const result = createRateSetSchema.safeParse(payload);

   if (!result.success) {
      throw toValidationError(result.error);
   }

   const rateSet = await repo.createRateSet(result.data);

   return rateSet;
}

export async function updateRateSet(id: number, payload: any) {
   const result = updateRateSetSchema.safeParse(payload);

   if (!result.success) {
      throw toValidationError(result.error);
   }

   const rateSet = await repo.updateRateSet(id, result.data);
   return rateSet;
}

export async function deleteRateSet(id: number) {
   const deleted = await repo.softDeleteRateSet(id);

   if (!deleted) throw new NotFoundError('Rate set not found');

   return deleted;
}

export async function importExcel(rateSetId: number, file: File) {
   await getRateSet(rateSetId);
   const summary = await importRateSetExcel(rateSetId, file);

   return summary;
}

export async function listRateSetPricingRegions() {
   return repo.listRateSetPricingRegions();
}

export async function listRateSetCategoryOptions(rateSetId: number) {
   const rows = await repo.listRateSetCategoryOptions(rateSetId);

   return rows.map(({ category_name, category_number, ...rest }) => ({
      ...rest,
      label: `${category_number} - ${category_name}`,
   }));
}

export async function listRateSetSupportItemOptions(
   categoryId: number,
   rateSetId: number,
) {
   const rows = await repo.listRateSetSupportItemsOptions(
      categoryId,
      rateSetId,
   );

   return rows.map(({ item_name, item_number, ...rest }) => ({
      ...rest,
      label: item_number ? `${item_number} - ${item_name}` : undefined,
   }));
}
