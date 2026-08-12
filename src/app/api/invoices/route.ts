import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import * as invoiceService from '@/services/invoice.service';

export const POST = withApiErrorHandling(async (req: NextRequest) => {
   const payload = await req.json();
   const invoices = await invoiceService.saveInvoice(payload);

   return apiSuccess(invoices);
});

export const GET = withApiErrorHandling(async (req: NextRequest) => {
   const { searchParams } = new URL(req.url);
   const page = Number(searchParams.get('page') ?? 1);
   const pageSize = Number(searchParams.get('pageSize') ?? 20);

   const { rows, total } = await invoiceService.listInvoices(page, pageSize);
   return apiSuccess(rows, { total, page, pageSize });
});
