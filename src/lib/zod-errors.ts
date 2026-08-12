import { ZodError } from 'zod';
import { ValidationError } from './errors';

export function toValidationError(error: ZodError): ValidationError {
   const details: Record<string, string[]> = {};

   for (const issue of error.issues) {
      const path = issue.path.join('.');

      details[path] ??= [];
      details[path].push(issue.message);
   }

   return new ValidationError('One or more fields are invalid.', details);
}
