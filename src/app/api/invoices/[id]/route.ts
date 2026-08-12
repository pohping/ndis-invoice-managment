import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import * as invoiceService from '@/services/invoice.service';

interface Params {
   params: Promise<{ id: string }>;
}

export const GET = withApiErrorHandling(
   async (req: NextRequest, { params }: Params) => {
      const { id } = await params;

      const row = await invoiceService.getInvoiceWithItems(Number(id));

      return apiSuccess(row ? { ...row.invoice, items: row.items } : null);
   },
);

export const DELETE = withApiErrorHandling(
   async (req: NextRequest, { params }: Params) => {
      const { id } = await params;
      await invoiceService.deleteInvoice(Number(id));

      return apiSuccess(null);
   },
);
