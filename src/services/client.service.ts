import * as clientRepo from '@/repositories/client.repository';
import {
   createClientSchema,
   updateClientSchema,
} from '@/modules/client/client.schema';
import { NotFoundError } from '@/lib/errors';
import { toValidationError } from '@/lib/zod-errors';

export async function listClients(page: number, pageSize: number) {
   return await clientRepo.listClients({ page, pageSize });
}

export async function createClient(payload: any) {
   const result = createClientSchema.safeParse(payload);

   if (!result.success) {
      throw toValidationError(result.error);
   }

   const client = await clientRepo.createClient(result.data);

   return client;
}

export async function updateClient(id: number, payload: any) {
   const result = updateClientSchema.safeParse(payload);

   if (!result.success) {
      throw toValidationError(result.error);
   }

   const client = await clientRepo.updateClient(id, result.data);

   return client;
}

export async function deleteClient(id: number) {
   const deleted = await clientRepo.softDeleteClient(id);

   if (!deleted) throw new NotFoundError('Client not found');

   return deleted;
}
