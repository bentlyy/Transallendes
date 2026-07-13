import { z } from 'zod'

export const ingestSchema = z.object({
  device_id: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed_kmh: z.number().min(0).optional(),
  direction: z.number().min(0).max(360).optional(),
  ignition: z.boolean().optional(),
  odometer_km: z.number().min(0).optional(),
  fuel_level: z.number().min(0).max(100).optional(),
  fuel_consumption: z.number().min(0).optional(),
  temperature: z.number().optional(),
  battery_level: z.number().min(0).max(100).optional(),
  external_power: z.boolean().optional(),
  recorded_at: z.string().datetime(),
  truck_id: z.number().int().positive().optional(),
  driver_id: z.number().int().positive().optional(),
  trip_id: z.number().int().positive().optional(),
  raw_data: z.record(z.string(), z.unknown()).optional(),
})

export const batchIngestSchema = z.array(ingestSchema).min(1).max(1000)
