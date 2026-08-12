import { tokenizeName } from '@/lib/data-parser';
import { db } from '@/lib/db';
import type {
   CreateClientInput,
   UpdateClientInput,
} from '@/modules/client/client.schema';

const baseSelect = () =>
   db.selectFrom('client').where('deleted_at', 'is', null);

export async function listClients(params: { page: number; pageSize: number }) {
   let query = baseSelect();

   const [rows, totalRow] = await Promise.all([
      query
         .leftJoin('gender', 'gender.id', 'client.gender_id')
         .selectAll('client')
         .select(['gender.label as gender_label'])
         .orderBy('client.last_name', 'asc')
         .limit(params.pageSize)
         .offset((params.page - 1) * params.pageSize)
         .execute(),
      query
         .select(db.fn.countAll<string>().as('count'))
         .executeTakeFirstOrThrow(),
   ]);

   return { rows, total: Number(totalRow.count) };
}

export async function getClient(id: number) {
   return baseSelect().where('id', '=', id).selectAll().executeTakeFirst();
}

export async function createClient(input: CreateClientInput) {
   return db
      .insertInto('client')
      .values({
         ...input,
         name_parts: tokenizeName(`${input.first_name} ${input.last_name}`),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
}

export async function updateClient(id: number, input: UpdateClientInput) {
   return db
      .updateTable('client')
      .set({ ...input, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
}

export async function softDeleteClient(id: number) {
   return db
      .updateTable('client')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
}
