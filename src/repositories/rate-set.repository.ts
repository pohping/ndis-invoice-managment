import { db } from '@/lib/db';
import {
   CreateRateSetInput,
   UpdateRateSetInput,
} from '@/modules/rate-set/rate-set.schema';

const baseSelect = () =>
   db.selectFrom('rate_set').where('deleted_at', 'is', null);

export async function listRateSets(params: { page: number; pageSize: number }) {
   const [rows, totalRow] = await Promise.all([
      baseSelect()
         .selectAll()
         .orderBy('start_date', 'desc')
         .limit(params.pageSize)
         .offset((params.page - 1) * params.pageSize)
         .execute(),
      baseSelect()
         .select(db.fn.countAll<string>().as('count'))
         .executeTakeFirstOrThrow(),
   ]);
   return { rows, total: Number(totalRow.count) };
}

export async function getRateSetById(id: number) {
   return baseSelect().selectAll().where('id', '=', id).executeTakeFirst();
}

export async function createRateSet(input: CreateRateSetInput) {
   return db
      .insertInto('rate_set')
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
}

export async function updateRateSet(id: number, input: UpdateRateSetInput) {
   return db
      .updateTable('rate_set')
      .set({ ...input, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
}

export async function softDeleteRateSet(id: number) {
   return db
      .updateTable('rate_set')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
}

export async function listRateSetPricingRegions() {
   return db
      .selectFrom('rate_set_support_item_pricing_region')
      .where('deactivated_at', 'is', null)
      .selectAll()
      .execute();
}

export async function listRateSetCategoryOptions(rateSetId: number) {
   return db
      .selectFrom('rate_set_category')
      .select(['category_name', 'category_number'])
      .select((eb) => eb.fn.min('id').as('id'))
      .where('deleted_at', 'is', null)
      .where('rate_set_id', '=', rateSetId)
      .groupBy(['category_name', 'category_number'])
      .execute();
}

export async function listRateSetSupportItemsOptions(
   categoryId: number,
   rateSetId: number,
) {
   return db
      .selectFrom('rate_set_support_item')
      .select(['item_name', 'item_number'])
      .select((eb) => eb.fn.min('id').as('id'))
      .where('deleted_at', 'is', null)
      .where('category_id', '=', categoryId)
      .where('rate_set_id', '=', rateSetId)
      .groupBy(['item_name', 'item_number'])
      .execute();
}
