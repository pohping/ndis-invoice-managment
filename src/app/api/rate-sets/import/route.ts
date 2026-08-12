import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import { ApiError, ValidationError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import * as rateSetService from '@/services/rate-set.service';

export const POST = withApiErrorHandling(async (req: NextRequest) => {
   const formData = await req.formData();
   const rateSetId = Number(formData.get('rateSetId'));
   const file = formData.get('file') as File;

   const errors: string[] = [];
   if (!(file instanceof File)) errors.push('Excel file is required.');
   if (!rateSetId) errors.push('Rate set id is required.');

   if (errors.length > 0)
      throw new ValidationError('Either excel file or rate set id is missing.');

   const summary = await rateSetService.importExcel(rateSetId, file);

   return apiSuccess(summary);
});
