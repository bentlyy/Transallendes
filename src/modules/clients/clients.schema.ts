import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  rut: z.string().max(20).nullable().optional(),
  email: z.string().email('Invalid email').max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  contact_name: z.string().max(255).nullable().optional(),
  contact_email: z.string().email('Invalid email').max(255).nullable().optional(),
  contact_phone: z.string().max(50).nullable().optional(),
  status: z.string().max(50).default('active'),
  config: z.record(z.string(), z.unknown()).default({} as Record<string, unknown>),
}).strict();

export const updateClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  rut: z.string().max(20).nullable().optional(),
  email: z.string().email('Invalid email').max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  contact_name: z.string().max(255).nullable().optional(),
  contact_email: z.string().email('Invalid email').max(255).nullable().optional(),
  contact_phone: z.string().max(50).nullable().optional(),
  status: z.string().max(50).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
}).strict();
