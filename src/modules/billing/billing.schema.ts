import { z } from 'zod'

export const createInvoiceSchema = z
  .object({
    client_id: z.coerce.number().int().positive(),
    trip_ids: z.array(z.coerce.number().int().positive()).min(1),
    due_date: z.string(),
    notes: z.string().nullable().optional(),
  })
  .strict()

export const updateInvoiceStatusSchema = z
  .object({
    status: z.enum(['pending', 'invoiced', 'paid', 'overdue']),
    notes: z.string().nullable().optional(),
    paid_at: z.string().nullable().optional(),
  })
  .strict()
