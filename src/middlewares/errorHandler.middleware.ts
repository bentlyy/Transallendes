import { Request, Response, ErrorRequestHandler } from 'express'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500
  const isServerError = statusCode >= 500

  if (isServerError) {
    logger.error(`${req.method} ${req.path} ${statusCode}`, {
      error: err.message,
      stack: err.stack,
      requestId: req.headers['x-request-id'],
    })
  } else {
    logger.warn(`${req.method} ${req.path} ${statusCode}`, {
      error: err.message,
      errorCode: err instanceof AppError ? err.errorCode : undefined,
      requestId: req.headers['x-request-id'],
    })
  }

  const isDev = process.env.NODE_ENV === 'development'

  const body: Record<string, unknown> = {
    status: 'error',
    statusCode,
    errorCode: err instanceof AppError ? err.errorCode : 'INTERNAL_ERROR',
    message: err.message || 'Error interno del servidor',
  }

  if (isDev) {
    body.stack = err.stack
    if (err instanceof AppError && err.details) {
      body.details = err.details
    }
  }

  res.status(statusCode).json(body)
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    errorCode: 'ROUTE_NOT_FOUND',
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
  })
}
