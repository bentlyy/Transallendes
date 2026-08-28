import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres')
  .max(128)
  .regex(/[A-Z]/, 'La contrasena debe contener al menos una letra mayuscula')
  .regex(/[a-z]/, 'La contrasena debe contener al menos una letra minuscula')
  .regex(/[0-9]/, 'La contrasena debe contener al menos un numero')
  .regex(/[^A-Za-z0-9]/, 'La contrasena debe contener al menos un caracter especial')

export const registerSchema = z
  .object({
    email: z.string().email('Formato de email invalido').min(1, 'El email es obligatorio').max(255),
    password: passwordSchema,
    name: z.string().min(1, 'El nombre es obligatorio'),
    phone: z.string().optional(),
    company_name: z.string().optional(),
  })
  .strict()

export const loginSchema = z
  .object({
    email: z.string().email('Formato de email invalido'),
    password: z.string().min(1, 'La contrasena es obligatoria'),
    totp_code: z.string().optional(),
    tenant_id: z.string().optional(),
  })
  .strict()

export const refreshSchema = z
  .object({
    refresh_token: z.string().min(1, 'El token de refresco es obligatorio'),
  })
  .strict()

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'La contrasena actual es obligatoria'),
    new_password: passwordSchema,
  })
  .strict()

export const forgotPasswordSchema = z
  .object({
    email: z.string().email('Formato de email invalido'),
    tenant_id: z.string().optional(),
  })
  .strict()

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'El token de restablecimiento es obligatorio'),
    email: z.string().email('Formato de email invalido'),
    password: passwordSchema,
  })
  .strict()
