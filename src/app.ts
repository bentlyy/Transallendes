import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import 'dotenv/config'
import { resolve } from 'path'

import { pool } from './shared/db.js'
import { loadTenantsFromDB } from './shared/multi-tenant.service.js'
import { gpsProviderRegistry } from './modules/gps-providers/gps-provider-registry.js'
import { MockGpsProvider } from './modules/gps-providers/providers/mock.provider.js'
import { securityMiddleware, validateEnvSecurity } from './middlewares/security.middleware.js'
import { tenantMiddleware } from './middlewares/tenant.middleware.js'
import { optionalAuth } from './middlewares/auth.middleware.js'
import { requestLogger } from './middlewares/requestLogger.middleware.js'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js'
import { trackActivity } from './middlewares/sessionActivity.middleware.js'
import { startAllJobs } from './jobs/index.js'
import { logger } from './utils/logger.js'
import pkg from '../package.json'

import authRoutes from './modules/auth/auth.routes.js'
import truckRoutes from './modules/trucks/trucks.routes.js'
import driverRoutes from './modules/drivers/drivers.routes.js'
import clientRoutes from './modules/clients/clients.routes.js'
import tripRoutes from './modules/trips/trips.routes.js'
import gpsProviderRoutes from './modules/gps-providers/gps-providers.routes.js'
import geofenceRoutes from './modules/geofences/geofences.routes.js'
import alertRoutes from './modules/alerts/alerts.routes.js'
import mapRoutes from './modules/map/map.routes.js'
import analyticsRoutes from './modules/analytics/analytics.routes.js'
import reportRoutes from './modules/reports/reports.routes.js'
import maintenanceRoutes from './modules/maintenance/maintenance.routes.js'
import billingRoutes from './modules/billing/billing.routes.js'
import notificationRoutes from './modules/notifications/notifications.routes.js'
import superAdminRoutes from './modules/super-admin/super-admin.routes.js'

const app: Express = express()

app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])

const healthHandler = async (_req: Request, res: Response) => {
  try {
    const startDb = Date.now()
    let dbStatus = 'ok'
    let dbLatency = 0
    try {
      await pool.query('SELECT 1')
      dbLatency = Date.now() - startDb
    } catch {
      dbStatus = 'error'
    }

    const mem = process.memoryUsage()
    const memUsed = Math.round(mem.heapUsed / 1024 / 1024)
    const memTotal = Math.round(mem.heapTotal / 1024 / 1024)

    res.json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: pkg.version,
      checks: {
        database: { status: dbStatus, latency_ms: dbLatency },
        memory: { status: 'ok', heap_used_mb: memUsed, heap_total_mb: memTotal },
      },
    })
  } catch {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: pkg.version,
      checks: {
        database: { status: 'error', latency_ms: 0 },
        memory: { status: 'unknown', heap_used_mb: 0, heap_total_mb: 0 },
      },
    })
  }
}

app.get('/health', healthHandler)
app.get('/api/health', healthHandler)

app.use(securityMiddleware)
app.use(compression())

// Serve static frontend assets BEFORE auth/tenant/rate-limit middlewares so
// that /assets/* and index.html are served directly from disk without hitting
// the database or counting against the global rate limiter.
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve(process.cwd(), 'frontend/dist')))
}

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
const allowedOrigins = ['http://localhost:5173', frontendUrl].filter((origin): origin is string => Boolean(origin))

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }
      if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
        callback(new Error('CORS misconfigured: no allowed origins in production'))
        return
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, origin)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    maxAge: 86400,
  }),
)

app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(optionalAuth)
// Tenant resolution and session activity only apply to API routes. The SPA and
// its static assets must never depend on the database (avoids 500/JSON errors
// for /assets/* and client-side routes when the tenant lookup fails).
app.use('/api', tenantMiddleware)
app.use(trackActivity)
app.use(requestLogger)

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => {
    if (req.tenant_id) return `tenant:${req.tenant_id}:${req.ip || 'unknown'}`
    return `ip:${req.ip || 'unknown'}`
  },
  skip: (req) => req.path === '/health' || req.path === '/api/health',
  handler: (req, res) => {
    logger.warn('Rate limit exceeded (global)', { path: req.path, ip: req.ip, tenant_id: req.tenant_id })
    res.status(429).json({ error: 'Too many requests, please try again later' })
  },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  keyGenerator: (req: Request) => `auth:${req.ip}:${(req.body?.email || '') as string}`,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded (auth)', { email: req.body?.email, ip: req.ip })
    res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
  },
})

app.use(globalLimiter)
app.use('/api/auth', authLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/trucks', truckRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/gps', gpsProviderRoutes)
app.use('/api/geofences', geofenceRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/map', mapRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/super-admin', superAdminRoutes)

if (process.env.NODE_ENV === 'production') {
  const frontendPath = resolve(process.cwd(), 'frontend/dist')
  const indexPath = resolve(frontendPath, 'index.html')
  app.get(/^\/(?!api\/)/, (_req, res) => {
    res.sendFile(indexPath, (err) => {
      if (err) {
        res
          .type('html')
          .send(
            '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Transallendes</title></head><body><div id="root"></div></body></html>',
          )
      }
    })
  })
}

app.use(notFoundHandler)
app.use(errorHandler)

const PORT = process.env.PORT || 3000

const step = (label: string) => logger.info(`[STARTUP] ${label}`)

const main = async (): Promise<void> => {
  const server = app.listen(PORT, () => {
    logger.info(`API running on http://localhost:${PORT}`)
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    logger.error(`SERVER BIND FAILED: port=${PORT} code=${err.code} message=${err.message}`)
    process.exit(1)
  })

  step('validateEnvSecurity')
  validateEnvSecurity()

  step('DB retry loop')
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await pool.query({ text: 'SELECT 1', signal: AbortSignal.timeout(10000) } as any)
      break
    } catch (dbErr) {
      logger.warn(`DB connection attempt ${attempt}/30 failed`, {
        error: (dbErr as Error).message,
        code: (dbErr as NodeJS.ErrnoException).code,
      })
      if (attempt === 30) throw dbErr
      await new Promise((r: (value: unknown) => void) => setTimeout(r, 5000))
    }
  }
  logger.info('DB connected')

  step('loadTenants')
  await loadTenantsFromDB()

  step('register GPS providers')
  gpsProviderRegistry.register(new MockGpsProvider())

  step('connectAll GPS providers')
  await gpsProviderRegistry.connectAll()

  step('startAllJobs')
  startAllJobs()

  step('Startup complete')
}

process.on('unhandledRejection', (reason) => {
  const mem = process.memoryUsage()
  logger.error('Unhandled Rejection', {
    reason,
    memory: {
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    },
  })
})

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...')
  await gpsProviderRegistry.disconnectAll()
  await pool.end().catch((err: unknown) => logger.warn('Pool close error on SIGTERM', (err as Error).message))
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...')
  await gpsProviderRegistry.disconnectAll()
  await pool.end().catch((err: unknown) => logger.warn('Pool close error on SIGINT', (err as Error).message))
  process.exit(0)
})

export { app }

if (process.env.NODE_ENV !== 'test') {
  main().catch((err) => {
    logger.error('Fatal startup error', { error: (err as Error).message, stack: (err as Error).stack })
    process.exit(1)
  })
}
