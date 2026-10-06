import { RequestHandler } from 'express'
import { tenantService } from '../shared/multi-tenant.service.js'
import { logger } from '../utils/logger.js'

const PUBLIC_PATHS = new Set([
  '/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
])

const PUBLIC_PREFIXES = ['/api/webhooks/']

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))
}

export const tenantMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const publicPath = isPublicPath(req.path)
    let tenantId: string | undefined

    const isSuperAdmin = req.user?.role === 'superadmin'

    // Superadmin can override tenant via header; otherwise they see all data
    if (isSuperAdmin) {
      tenantId = req.headers['x-tenant-id'] as string | undefined
      if (!tenantId && process.env.DEFAULT_TENANT_ID) {
        tenantId = process.env.DEFAULT_TENANT_ID
      }
      if (!tenantId) {
        tenantId = 'default'
      }
      req.tenant_id = tenantId
      req.locale = 'en'
      next()
      return
    }

    tenantId = req.headers['x-tenant-id'] as string | undefined

    if (!tenantId && req.user?.tenant_id) {
      tenantId = req.user.tenant_id
    }

    if (!tenantId) {
      tenantId = process.env.DEFAULT_TENANT_ID
    }

    if (!tenantId) {
      if (publicPath) {
        req.tenant_id = 'default'
        req.locale = 'en'
        next()
        return
      }
      logger.error('No tenant could be resolved for request', { path: req.path })
      return res.status(400).json({ error: 'Tenant not resolved' })
    }

    req.tenant_id = tenantId

    if (!publicPath) {
      let tenant = tenantService.getById(tenantId)
      if (!tenant) {
        await tenantService.loadFromDB()
        tenant = tenantService.getById(tenantId)
      }

      if (!tenant) {
        logger.warn('Unknown tenant', { tenantId, path: req.path })
        return res.status(404).json({ error: 'Tenant not found' })
      }

      if (!tenant.active) {
        logger.warn('Inactive tenant', { tenantId })
        return res.status(403).json({ error: 'Tenant is inactive' })
      }

      req.locale = tenant.locale || 'en'
    } else {
      req.locale = req.locale || 'en'
    }

    next()
  } catch (error) {
    logger.error('Tenant middleware error', { error: (error as Error).message })
    next(error)
  }
}
