import { RequestHandler } from 'express'
import { logger } from '../utils/logger.js'

const SENSITIVE_FIELDS = new Set([
  'password',
  'password_confirmation',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'authorization',
  'cookie',
  'stripe_key',
  'api_key',
])

function sanitizeBody(body: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return body

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.has(key)) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeBody(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start

    const logData: Record<string, unknown> = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'],
    }

    if (req.user) {
      logData.userId = req.user.id
      logData.tenantId = req.tenant_id
    }

    if (Object.keys(req.body || {}).length > 0 && req.method !== 'GET') {
      logData.body = sanitizeBody(req.body)
    }

    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    logger.log(level, `${req.method} ${req.path} ${res.statusCode}`, logData)
  })

  next()
}
