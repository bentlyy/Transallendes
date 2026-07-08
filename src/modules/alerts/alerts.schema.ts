import { z } from 'zod';

export const acknowledgeAlertSchema = z.object({
  acknowledged_by: z.number().int().positive().optional(),
});

export const createAlertSchema = z.object({
  type: z.string().min(1).max(100),
  severity: z.enum(['info', 'warning', 'critical', 'emergency']),
  title: z.string().min(1).max(300),
  message: z.string().min(1).max(2000),
  resource_type: z.string().max(100).optional(),
  resource_id: z.number().int().positive().optional(),
  driver_id: z.number().int().positive().optional(),
  truck_id: z.number().int().positive().optional(),
  trip_id: z.number().int().positive().optional(),
  geofence_id: z.number().int().positive().optional(),
});

export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
