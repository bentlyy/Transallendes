import { z } from 'zod'

export const createTruckSchema = z
  .object({
    plate: z.string().min(1, 'La patente es obligatoria').max(20),
    brand: z.string().min(1, 'La marca es obligatoria').max(100),
    model: z.string().min(1, 'El modelo es obligatorio').max(100),
    year: z.coerce.number().int().min(1980).max(2100),
    capacity_kg: z.coerce.number().positive(),
    capacity_m3: z.coerce.number().positive(),
    status: z.enum(['active', 'in_maintenance', 'out_of_service', 'retired'] as const).default('active'),
    driver_id: z.coerce.number().int().positive().nullable().optional(),
    client_id: z.coerce.number().int().positive().nullable().optional(),
    gps_device_id: z.string().max(100).nullable().optional(),
    gps_provider: z.string().max(100).nullable().optional(),
    insurance_expiry: z.string().nullable().optional(),
    technical_review_expiry: z.string().nullable().optional(),
    permits: z.array(z.string()).default([]),
    notes: z.string().nullable().optional(),
  })
  .strict()

export const updateTruckSchema = z
  .object({
    plate: z.string().min(1).max(20).optional(),
    brand: z.string().min(1).max(100).optional(),
    model: z.string().min(1).max(100).optional(),
    year: z.coerce.number().int().min(1980).max(2100).optional(),
    capacity_kg: z.coerce.number().positive().optional(),
    capacity_m3: z.coerce.number().positive().optional(),
    status: z.enum(['active', 'in_maintenance', 'out_of_service', 'retired'] as const).optional(),
    driver_id: z.coerce.number().int().positive().nullable().optional(),
    client_id: z.coerce.number().int().positive().nullable().optional(),
    gps_device_id: z.string().max(100).nullable().optional(),
    gps_provider: z.string().max(100).nullable().optional(),
    insurance_expiry: z.string().nullable().optional(),
    technical_review_expiry: z.string().nullable().optional(),
    permits: z.array(z.string()).optional(),
    notes: z.string().nullable().optional(),
  })
  .strict()
