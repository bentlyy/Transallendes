import { z } from 'zod'

export const generateReportSchema = z
  .object({
    type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    format: z.enum(['pdf', 'excel', 'csv']),
    from: z.string().optional(),
    to: z.string().optional(),
    client_id: z.coerce.number().int().positive().optional(),
    driver_id: z.coerce.number().int().positive().optional(),
    truck_id: z.coerce.number().int().positive().optional(),
    filters: z.object({}).passthrough().optional(),
  })
  .strict()
