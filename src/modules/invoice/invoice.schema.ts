import { z } from 'zod';

const invoiceItemSchema = z.object({
   rate_set_id: z.number().int().positive(),
   category_id: z.number().int().positive(),
   support_item_id: z.number().int().positive(),

   start_date: z.coerce.date(),
   end_date: z.coerce.date(),

   max_rate: z.coerce.number().nonnegative().optional(),

   unit: z.coerce.number().nonnegative(),
   input_rate: z.coerce.number().nonnegative(),

   amount: z.coerce.number().nonnegative(),
});

const invoiceSchema = z.object({
   id: z.number().int().positive().optional(),

   client_id: z.number().int().positive(),
   provider_id: z.number().int().positive(),

   invoice_number: z.string().trim().min(1, 'Invoice number is required'),

   invoice_date: z.coerce.date(),

   amount: z.coerce.number().nonnegative(),

   expected_amount: z.coerce.number().nonnegative(),

   status: z.enum(['drafted', 'completed']),

   items: z.array(invoiceItemSchema),
});

export const createInvoiceSchema = invoiceSchema;

export const draftedInvoiceSchema = invoiceSchema.pick({
   invoice_number: true,
   invoice_date: true,
   expected_amount: true,
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export type InvoiceInput = z.infer<typeof invoiceSchema>;
