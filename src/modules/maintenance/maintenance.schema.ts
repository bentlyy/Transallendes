import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  truck_id: z.coerce.number().int().positive(),
  type: z.enum(['preventive', 'corrective', 'inspection', 'tire_change', 'oil_change', 'other']),
  description: z.string().min(1),
  scheduled_date: z.string(),
  completed_date: z.string().nullable().optional(),
  odometer_at_km: z.coerce.number().int().nonnegative().nullable().optional(),
  cost: z.coerce.number().nonnegative().nullable().optional(),
  provider: z.string().max(200).nullable().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  notes: z.string().nullable().optional(),
}).strict();

export const updateMaintenanceSchema = z.object({
  truck_id: z.coerce.number().int().positive().optional(),
  type: z.enum(['preventive', 'corrective', 'inspection', 'tire_change', 'oil_change', 'other']).optional(),
  description: z.string().min(1).optional(),
  scheduled_date: z.string().optional(),
  completed_date: z.string().nullable().optional(),
  odometer_at_km: z.coerce.number().int().nonnegative().nullable().optional(),
  cost: z.coerce.number().nonnegative().nullable().optional(),
  provider: z.string().max(200).nullable().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().nullable().optional(),
}).strict();
