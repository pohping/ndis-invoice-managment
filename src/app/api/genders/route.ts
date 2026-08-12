import { apiSuccess, withApiErrorHandling } from '@/lib/api-response';
import { db } from '@/lib/db';

export const GET = withApiErrorHandling(async () => {
   const rows = await db
      .selectFrom('gender')
      .selectAll()
      .where('deactivated_at', 'is', null)
      .orderBy('label', 'asc')
      .execute();

   return apiSuccess(rows);
});
