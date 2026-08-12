import { NextRequest } from 'next/server';
import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import * as clientService from '@/services/client.service';

interface Params {
   params: Promise<{ id: string }>;
}

export const PUT = withApiErrorHandling(
   async (req: NextRequest, { params }: Params) => {
      const { id } = await params;
      const payload = await req.json();
      const client = await clientService.updateClient(Number(id), payload);

      return apiSuccess(client);
   },
);

export const DELETE = withApiErrorHandling(
   async (req: NextRequest, { params }: Params) => {
      const { id } = await params;
      await clientService.deleteClient(Number(id));

      return apiSuccess(null);
   },
);
