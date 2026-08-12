import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import * as rateSetServices from '@/services/rate-set.service';

export const GET = withApiErrorHandling(async (req: NextRequest) => {
   const { searchParams } = new URL(req.url);
   const categoryId = Number(searchParams.get('category_id'));
   const rateSetId = Number(searchParams.get('rate_set_id'));

   const options = await rateSetServices.listRateSetSupportItemOptions(
      categoryId,
      rateSetId,
   );

   return apiSuccess(options);
});
