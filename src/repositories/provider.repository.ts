import { tokenizeName } from '@/lib/data-parser';
import { db } from '@/lib/db';
import type {
   CreateProviderInput,
   UpdateProviderInput,
} from '@/modules/provider/provider.schema';

const baseSelect = () =>
   db.selectFrom('provider').where('provider.deleted_at', 'is', null);

export async function listProviders(params: {
   pageSize: number;
   page: number;
}) {
   let query = baseSelect();

   const [rows, totalRow] = await Promise.all([
      query
         .selectAll()
         .orderBy('name', 'asc')
         .limit(params.pageSize)
         .offset((params.page - 1) * params.pageSize)
         .execute(),
      query
         .select(db.fn.countAll<string>().as('count'))
         .executeTakeFirstOrThrow(),
   ]);

   return { rows, total: Number(totalRow.count) };
}

export async function createProvider(input: CreateProviderInput) {
   return db
      .insertInto('provider')
      .values({
         ...input,
         name_parts: tokenizeName(input.name),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
}

export async function updateProvider(id: number, input: UpdateProviderInput) {
   return db
      .updateTable('provider')
      .set({ ...input, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
}

export async function softDeleteProvider(id: number) {
   return db
      .updateTable('provider')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
}
