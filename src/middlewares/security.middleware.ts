import helmet from 'helmet'
import hpp from 'hpp'
import { RequestHandler } from 'express'
import { logger } from '../utils/logger.js'

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  'https://maps.googleapis.com',
  'https://unpkg.com',
  'https://api.mapbox.com',
  'https://events.mapbox.com',
]

const styleSrc = [
  "'self'",
  "'unsafe-inline'",
  'https://fonts.googleapis.com',
  'https://unpkg.com',
  'https://api.mapbox.com',
  'https://api.tiles.mapbox.com',
  'https://maps.gstatic.com',
]

const imgSrc = [
  "'self'",
  'data:',
  'blob:',
  'https://maps.googleapis.com',
  'https://maps.gstatic.com',
  'https://api.mapbox.com',
  'https://api.tiles.mapbox.com',
  'https://unpkg.com',
  'https://*.tile.openstreetmap.org',
]

const fontSrc = ["'self'", 'https://fonts.gstatic.com', 'data:']

const connectSrc = [
  "'self'",
  'https://maps.googleapis.com',
  'https://api.mapbox.com',
  'https://events.mapbox.com',
  'https://api.tiles.mapbox.com',
]

const frameSrc = ["'self'", 'https://www.google.com']

export const securityMiddleware: RequestHandler[] = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc,
        styleSrc,
        imgSrc,
        fontSrc,
        connectSrc,
        frameSrc,
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameAncestors: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    ieNoOpen: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  }),

  hpp(),

  (_req, res, _next) => {
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(self), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self), autoplay=()',
    )
    _next()
  },
]

export const validateEnvSecurity = (): void => {
  const errors: string[] = []

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    errors.push('JWT_SECRET is not set')
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long')
  } else if (jwtSecret === 'CHANGEME_jwt_secret_key_min_32_chars_long') {
    errors.push('JWT_SECRET must be changed from the default value')
  }

  const auditHmacSecret = process.env.AUDIT_HMAC_SECRET
  if (!auditHmacSecret) {
    errors.push('AUDIT_HMAC_SECRET is not set')
  } else if (auditHmacSecret.length < 32) {
    errors.push('AUDIT_HMAC_SECRET must be at least 32 characters long')
  }

  const encryptionKey = process.env.ENCRYPTION_KEY
  if (!encryptionKey) {
    errors.push('ENCRYPTION_KEY is not set')
  } else if (encryptionKey.length < 16) {
    errors.push('ENCRYPTION_KEY must be at least 16 characters long')
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    errors.push('DATABASE_URL is not set')
  } else if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string')
  }

  if (errors.length > 0) {
    for (const error of errors) {
      logger.error(`Security validation failed: ${error}`)
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Security environment validation failed:\n${errors.join('\n')}`)
    }
    logger.warn('Running with security warnings (non-production mode)')
  } else {
    logger.info('All security environment variables validated')
  }
}
