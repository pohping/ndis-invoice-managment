import * as repo from '@/repositories/provider.repository';
import {
   createProviderSchema,
   updateProviderSchema,
} from '@/modules/provider/provider.schema';
import { NotFoundError } from '@/lib/errors';
import { toValidationError } from '@/lib/zod-errors';

export async function listProviders(page: number, pageSize: number) {
   return repo.listProviders({ page, pageSize });
}

export async function createProvider(payload: any) {
   const result = createProviderSchema.safeParse(payload);

   if (!result.success) {
      throw toValidationError(result.error);
   }

   const provider = await repo.createProvider(result.data);
   return provider;
}

export async function updateProvider(id: number, payload: any) {
   const result = updateProviderSchema.safeParse(payload);

   if (!result.success) {
      throw toValidationError(result.error);
   }

   const provider = await repo.updateProvider(id, result.data);
   return provider;
}

export async function deleteProvider(id: number) {
   const deleted = await repo.softDeleteProvider(id);

   if (!deleted) throw new NotFoundError('Provider not found');

   return deleted;
}
