import { z } from 'zod'

export const createTenantSchema = z
  .object({
    id: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    domain: z.string().min(1).max(200),
    locale: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
    config: z.object({}).passthrough().optional(),
  })
  .strict()

export const updateTenantSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    domain: z.string().min(1).max(200).optional(),
    locale: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
    config: z.object({}).passthrough().optional(),
    active: z.boolean().optional(),
  })
  .strict()
