import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import * as invoiceService from '@/services/invoice.service';
import { BadRequestError } from '@/lib/errors';

export const GET = withApiErrorHandling(async (req: NextRequest) => {
   const { searchParams } = new URL(req.url);
   const startDateParam = searchParams.get('start_date');
   const endDateParam = searchParams.get('end_date');

   if (!startDateParam || !endDateParam) {
      throw new BadRequestError('start_date and end_date are required');
   }

   const maxRate = await invoiceService.getInvoiceItemMaxRate({
      supportItemId: Number(searchParams.get('support_item_id')),
      rateSetId: Number(searchParams.get('rate_set_id')),
      clientId: Number(searchParams.get('client_id')),
      startDate: new Date(startDateParam),
      endDate: new Date(endDateParam),
   });

   return apiSuccess(maxRate);
});
