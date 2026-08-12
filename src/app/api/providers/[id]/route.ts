import type { NextRequest } from 'next/server';
import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import * as providerService from '@/services/provider.service';

interface Params {
   params: Promise<{ id: string }>;
}

export const PUT = withApiErrorHandling(
   async (req: NextRequest, { params }: Params) => {
      const { id } = await params;
      const payload = await req.json();
      const provider = await providerService.updateProvider(
         Number(id),
         payload,
      );

      return apiSuccess(provider);
   },
);

export const DELETE = withApiErrorHandling(
   async (req: NextRequest, { params }: Params) => {
      const { id } = await params;
      await providerService.deleteProvider(Number(id));

      return apiSuccess(null);
   },
);
