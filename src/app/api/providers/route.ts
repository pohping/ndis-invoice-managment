import { NextRequest } from 'next/server';
import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import * as providerService from '@/services/provider.service';

export const GET = withApiErrorHandling(async (req: NextRequest) => {
   const { searchParams } = new URL(req.url);
   const page = Number(searchParams.get('page') ?? 1);
   const pageSize = Number(searchParams.get('pageSize') ?? 20);

   const { rows, total } = await providerService.listProviders(page, pageSize);

   return apiSuccess(rows, { total, page, pageSize });
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
   const body = await req.json();
   const provider = await providerService.createProvider(body);

   return apiSuccess(provider);
});
