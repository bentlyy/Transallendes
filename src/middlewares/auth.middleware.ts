import { RequestHandler, Request } from 'express'
import { jwtManager } from '../shared/jwt.service.js'
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import type { UserRole } from '../types/index.js'

export const authMiddleware: RequestHandler = (req, _res, next) => {
  try {
    const token = extractToken(req)
    if (!token) {
      throw new UnauthorizedError('Authentication required')
    }

    const decoded = jwtManager.verify<{
      id: number
      email: string
      role: UserRole
      name?: string
      phone?: string
      tenant_id: string
    }>(token)

    if (!decoded || !decoded.id || !decoded.email || !decoded.role) {
      throw new UnauthorizedError('Invalid token payload')
    }

    if (decoded.tenant_id && req.tenant_id && decoded.tenant_id !== req.tenant_id) {
      logger.warn('Tenant mismatch in token', {
        tokenTenant: decoded.tenant_id,
        requestTenant: req.tenant_id,
      })
      throw new UnauthorizedError('Tenant mismatch')
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      phone: decoded.phone,
      tenant_id: decoded.tenant_id ?? req.tenant_id,
    }

    if (!req.tenant_id && req.user.tenant_id) {
      req.tenant_id = req.user.tenant_id
    }

    next()
  } catch (error) {
    next(error)
  }
}

export const optionalAuth: RequestHandler = (req, _res, next) => {
  try {
    const token = extractToken(req)
    if (!token) return next()

    const decoded = jwtManager.verify<{
      id: number
      email: string
      role: UserRole
      name?: string
      phone?: string
      tenant_id: string
    }>(token)

    if (decoded?.id && decoded?.email && decoded?.role) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
        phone: decoded.phone,
        tenant_id: decoded.tenant_id,
      }

      if (!req.tenant_id && req.user.tenant_id) {
        req.tenant_id = req.user.tenant_id
      }
    }

    next()
  } catch {
    next()
  }
}

export const authorize = (...roles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'))
    }

    const allowed = roles.length === 0 || roles.includes(req.user.role) || req.user.role === 'superadmin'
    if (!allowed) {
      return next(new ForbiddenError('Insufficient permissions'))
    }

    next()
  }
}

export const setSecurityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  next()
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  const cookie = req.cookies?.access_token
  if (cookie) {
    return cookie
  }

  return null
}
