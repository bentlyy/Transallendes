import { z } from 'zod';

export const createNotificationSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  title: z.string().min(1).max(255),
  body: z.string().optional(),
  type: z.string().max(50).optional(),
  data: z.object({}).passthrough().optional(),
}).strict();
