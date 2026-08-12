import { z } from 'zod';

const requiredTrimmedString = (field: string) =>
   z
      .string()
      .min(1, `${field} is required.`)
      .refine((value) => value.trim().length > 0, {
         message: `${field} cannot be empty.`,
      });

export const createClientSchema = z.object({
   first_name: requiredTrimmedString('First name'),

   last_name: requiredTrimmedString('Last name'),

   gender_id: z
      .number({
         error: 'Please select a gender.',
      })
      .int(),

   dob: z.iso.date({
      error: 'Date of birth is required.',
   }),

   ndis_number: z
      .string()
      .min(1, 'NDIS number is required.')
      .regex(/^\d{1,16}$/, {
         message: 'NDIS number must contain only digits and up to 16 digits.',
      }),

   email: z.email({
      error: 'Please enter a valid email address.',
   }),

   phone_number: z
      .string()
      .regex(/^\d{3,16}$/, {
         message:
            'Phone number must contain only digits and be between 3 and 16 digits.',
      })
      .optional()
      .or(z.literal('')),

   address: requiredTrimmedString('Address'),

   unit_building: z.string().optional(),

   pricing_region: z.string().min(1, 'Pricing region is required.'),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
