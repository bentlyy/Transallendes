import { RequestHandler } from 'express'
import { ZodSchema } from 'zod'
import { BadRequestError } from '../utils/errors.js'

export const validateZod = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body'): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const isDev = process.env.NODE_ENV === 'development'

      const details = result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }))

      const message = isDev
        ? `Validation failed: ${details.map((d) => `${d.field}: ${d.message}`).join('; ')}`
        : 'Validation failed'

      const error = new BadRequestError(message, isDev ? details : undefined)
      next(error)
      return
    }

    req[source] = result.data
    next()
  }
}
