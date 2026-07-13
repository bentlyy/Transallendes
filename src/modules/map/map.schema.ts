import { z } from 'zod'

export const filtersSchema = z.object({
  status: z.string().optional(),
  client_id: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
})

export const positionsQuerySchema = filtersSchema

export const clustersQuerySchema = z.object({
  sw_lat: z.coerce.number().min(-90).max(90).optional(),
  sw_lng: z.coerce.number().min(-180).max(180).optional(),
  ne_lat: z.coerce.number().min(-90).max(90).optional(),
  ne_lng: z.coerce.number().min(-180).max(180).optional(),
  zoom: z.coerce.number().int().min(0).max(22).optional().default(10),
  status: z.string().optional(),
})

export const truckInfoParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})
