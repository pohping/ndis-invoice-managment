import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import * as invoiceService from '@/services/invoice.service';

export const GET = withApiErrorHandling(async (req: NextRequest) => {
   const { searchParams } = new URL(req.url);
   const startDate = searchParams.get('start_date') ?? '';
   const endDate = searchParams.get('end_date') ?? '';
   const rateSet = await invoiceService.getInvoiceItemRateSetMatches(
      startDate,
      endDate,
   );

   return apiSuccess(rateSet);
});
