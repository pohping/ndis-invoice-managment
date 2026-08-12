import { z } from 'zod';

const rateSetBaseSchema = z.object({
   name: z.string().trim().min(1, 'Name is required.'),

   description: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined),

   start_date: z.coerce.date(),

   end_date: z.coerce.date().optional(),
});

export const createRateSetSchema = rateSetBaseSchema.refine(
   ({ start_date, end_date }) => !end_date || end_date >= start_date,
   {
      path: ['end_date'],
      message: 'End date must be after or equal to the start date.',
   },
);

export const updateRateSetSchema = rateSetBaseSchema
   .partial()
   .refine(
      ({ start_date, end_date }) =>
         !start_date || !end_date || end_date >= start_date,
      {
         path: ['end_date'],
         message: 'End date must be after or equal to the start date.',
      },
   );

export type CreateRateSetInput = z.infer<typeof createRateSetSchema>;
export type UpdateRateSetInput = z.infer<typeof updateRateSetSchema>;
