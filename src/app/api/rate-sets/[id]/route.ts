import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import * as rateSetService from '@/services/rate-set.service';

interface Params {
   params: Promise<{ id: string }>;
}

export const PUT = withApiErrorHandling(
   async (req: NextRequest, { params }: Params) => {
      const { id } = await params;
      const payload = await req.json();
      const rateSet = await rateSetService.updateRateSet(Number(id), payload);

      return apiSuccess(rateSet);
   },
);

export const DELETE = withApiErrorHandling(
   async (req: NextRequest, { params }: Params) => {
      const { id } = await params;
      await rateSetService.deleteRateSet(Number(id));

      return apiSuccess(null);
   },
);
