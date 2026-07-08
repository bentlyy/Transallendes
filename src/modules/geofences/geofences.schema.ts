import { z } from 'zod';

export const createGeofenceSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['circle', 'polygon', 'corridor']),
  center_lat: z.number().min(-90).max(90).optional(),
  center_lng: z.number().min(-180).max(180).optional(),
  radius_meters: z.number().nonnegative().optional(),
  polygon_points: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
  })).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(200).optional(),
  color: z.string().max(50).optional(),
  active: z.boolean().optional(),
});

export const updateGeofenceSchema = createGeofenceSchema.partial();

export type CreateGeofenceInput = z.infer<typeof createGeofenceSchema>;
export type UpdateGeofenceInput = z.infer<typeof updateGeofenceSchema>;
