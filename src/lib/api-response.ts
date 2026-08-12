import { NextResponse } from 'next/server';
import { ApiError } from './errors';

export function apiSuccess(data: unknown, meta?: Record<string, unknown>) {
   return NextResponse.json({ data, ...(meta ?? {}) });
}

export function apiError(err: unknown) {
   const isDev = process.env.NODE_ENV === 'development';

   if (err instanceof ApiError) {
      return NextResponse.json(
         {
            error: {
               code: err.code,
               message: isDev ? err.message : 'An error occurred.',
               ...(isDev && err.details ? { details: err.details } : {}),
            },
         },
         { status: err.status },
      );
   }

   return NextResponse.json(
      {
         error: {
            code: 'INTERNAL_ERROR',
            message: isDev
               ? err instanceof Error
                  ? err.message
                  : 'An unexpected error occurred.'
               : 'An unexpected error occurred.',
         },
      },
      { status: 500 },
   );
}

/**
 * Wraps a route handler so any thrown error is converted into
 * the standard error envelope automatically.
 */
export function withApiErrorHandling<Args extends unknown[], R>(
   handler: (...args: Args) => Promise<R>,
) {
   return async (...args: Args) => {
      try {
         return await handler(...args);
      } catch (err) {
         return apiError(err);
      }
   };
}
