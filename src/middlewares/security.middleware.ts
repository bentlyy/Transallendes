import helmet from 'helmet'
import hpp from 'hpp'
import { RequestHandler } from 'express'
import { logger } from '../utils/logger.js'

const cloudflareDomains = [
  'https://static.cloudflareinsights.com',
  'https://challenges.cloudflare.com',
  'https://ajax.cloudflare.com',
]

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...cloudflareDomains,
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
  ...cloudflareDomains,
  'https://maps.googleapis.com',
  'https://maps.gstatic.com',
  'https://api.mapbox.com',
  'https://api.tiles.mapbox.com',
  'https://unpkg.com',
  'https://*.tile.openstreetmap.org',
  'https://*.basemaps.cartocdn.com',
]

const fontSrc = ["'self'", 'https://fonts.gstatic.com', 'data:']

const connectSrc = [
  "'self'",
  ...cloudflareDomains,
  'https://maps.googleapis.com',
  'https://api.mapbox.com',
  'https://events.mapbox.com',
  'https://api.tiles.mapbox.com',
  'https://*.basemaps.cartocdn.com',
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
    errors.push('JWT_SECRET no esta configurado')
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET debe tener al menos 32 caracteres')
  } else if (jwtSecret === 'CHANGEME_jwt_secret_key_min_32_chars_long') {
    errors.push('JWT_SECRET debe cambiarse del valor por defecto')
  }

  const auditHmacSecret = process.env.AUDIT_HMAC_SECRET
  if (!auditHmacSecret) {
    errors.push('AUDIT_HMAC_SECRET no esta configurado')
  } else if (auditHmacSecret.length < 32) {
    errors.push('AUDIT_HMAC_SECRET debe tener al menos 32 caracteres')
  }

  const encryptionKey = process.env.ENCRYPTION_KEY
  if (!encryptionKey) {
    errors.push('ENCRYPTION_KEY no esta configurado')
  } else if (encryptionKey.length < 16) {
    errors.push('ENCRYPTION_KEY debe tener al menos 16 caracteres')
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    errors.push('DATABASE_URL no esta configurado')
  } else if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL debe ser una cadena de conexion PostgreSQL valida')
  }

  if (errors.length > 0) {
    for (const error of errors) {
      logger.error(`Fallo la validacion de seguridad: ${error}`)
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Fallo la validacion de seguridad del entorno:\n${errors.join('\n')}`)
    }
    logger.warn('Ejecutando con advertencias de seguridad (modo no produccion)')
  } else {
    logger.info('Todas las variables de entorno de seguridad fueron validadas')
  }
}
