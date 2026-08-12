export class ApiError extends Error {
   code: string;
   status: number;
   details?: Record<string, string[]>;

   constructor(
      code: string,
      message: string,
      status = 400,
      details?: Record<string, string[]>,
   ) {
      super(message);
      this.code = code;
      this.status = status;
      this.details = details;
   }
}

export class BadRequestError extends ApiError {
   constructor(message: string) {
      super('BAD_REQUEST', message, 400);
   }
}
export class ValidationError extends ApiError {
   constructor(
      message = 'One or more fields are invalid.',
      details?: Record<string, string[]>,
   ) {
      super('VALIDATION_ERROR', message, 422, details);
   }
}

export class NotFoundError extends ApiError {
   constructor(message: string) {
      super('NOT_FOUND', message, 404);
   }
}

export class ForbiddenError extends ApiError {
   constructor(message = 'You do not have permission to perform this action.') {
      super('FORBIDDEN', message, 403);
   }
}

export class UnauthorizedError extends ApiError {
   constructor(message = 'Authentication required.') {
      super('UNAUTHORIZED', message, 401);
   }
}
