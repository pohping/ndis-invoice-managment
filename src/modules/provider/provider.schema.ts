import { z } from 'zod';

export const createProviderSchema = z.object({
   abn: z
      .string()
      .min(1, 'ABN is required.')
      .regex(
         /^\d{1,11}$/,
         'ABN must contain only digits and be up to 11 digits.',
      ),

   name: z.string().trim().min(1, 'Name is required.'),

   email: z
      .string()
      .trim()
      .min(1, 'Email is required.')
      .email('Please enter a valid email address.'),

   phone_number: z
      .string()
      .regex(
         /^\d{3,16}$/,
         'Phone number must contain only digits and be between 3 and 16 digits.',
      )
      .optional()
      .or(z.literal('')),

   address: z.string().trim().min(1, 'Address is required.'),

   unit_building: z
      .string()
      .trim()
      .refine((value) => value.length > 0, 'Unit / Building must not be empty.')
      .optional()
      .or(z.literal('')),
});

export const updateProviderSchema = createProviderSchema.partial();

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
