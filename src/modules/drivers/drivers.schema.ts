import { z } from 'zod';

export const createDriverSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email').max(255),
  phone: z.string().max(50).nullable().optional(),
  license_type: z.string().max(50).nullable().optional(),
  license_expiry: z.string().nullable().optional(),
  license_number: z.string().max(100).nullable().optional(),
  documents: z.array(z.record(z.string(), z.unknown())).default([] as Record<string, unknown>[]),
  status: z.enum(['available', 'on_trip', 'resting', 'inactive'] as const).default('available'),
}).strict();

export const updateDriverSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email('Invalid email').max(255).optional(),
  phone: z.string().max(50).nullable().optional(),
  license_type: z.string().max(50).nullable().optional(),
  license_expiry: z.string().nullable().optional(),
  license_number: z.string().max(100).nullable().optional(),
  documents: z.array(z.record(z.string(), z.unknown())).optional(),
  status: z.enum(['available', 'on_trip', 'resting', 'inactive'] as const).optional(),
}).strict();
