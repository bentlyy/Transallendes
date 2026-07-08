import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  client_id: z.coerce.number().int().positive().optional(),
  driver_id: z.coerce.number().int().positive().optional(),
});
