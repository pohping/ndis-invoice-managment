import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import * as rateSetService from '@/services/rate-set.service';

export const GET = withApiErrorHandling(async () => {
   const pricingRegions = await rateSetService.listRateSetPricingRegions();

   return apiSuccess(pricingRegions);
});
