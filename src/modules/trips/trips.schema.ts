import { z } from 'zod'

export const createTripSchema = z.object({
  trip_number: z.string().optional(),
  client_id: z.number().int().positive(),
  truck_id: z.number().int().positive().optional(),
  driver_id: z.number().int().positive().optional(),
  origin_city: z.string().min(1).max(200),
  origin_country: z.string().min(1).max(100),
  destination_city: z.string().min(1).max(200),
  destination_country: z.string().min(1).max(100),
  route: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        timestamp: z.string().optional(),
      }),
    )
    .optional(),
  cargo_description: z.string().max(1000).optional(),
  cargo_weight_kg: z.number().positive().optional(),
  cargo_value: z.number().nonnegative().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'delayed']).optional(),
  departure_at: z.string().datetime().optional(),
  estimated_arrival_at: z.string().datetime().optional(),
  actual_arrival_at: z.string().datetime().optional(),
  distance_km: z.number().nonnegative().optional(),
  fuel_consumed: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  billing_status: z.enum(['pending', 'invoiced', 'paid', 'overdue']).optional(),
  documents: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        url: z.string(),
      }),
    )
    .optional(),
  notes: z.string().max(2000).optional(),
})

export const updateTripSchema = createTripSchema.partial()

export const updateTripStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'delayed']),
})

export type CreateTripInput = z.infer<typeof createTripSchema>
export type UpdateTripInput = z.infer<typeof updateTripSchema>
export type UpdateTripStatusInput = z.infer<typeof updateTripStatusSchema>
