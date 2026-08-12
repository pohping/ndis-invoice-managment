import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import * as clientService from '@/services/client.service';
import { NextRequest } from 'next/server';

export const GET = withApiErrorHandling(async (req: NextRequest) => {
   const { searchParams } = new URL(req.url);
   const page = Number(searchParams.get('page') ?? 1);
   const pageSize = Number(searchParams.get('pageSize') ?? 20);
   const { rows, total } = await clientService.listClients(page, pageSize);

   return apiSuccess(rows, { total, page, pageSize });
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
   const payload = await req.json();
   const client = await clientService.createClient(payload);

   return apiSuccess(client);
});
