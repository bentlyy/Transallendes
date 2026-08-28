export class AppError extends Error {
  statusCode: number
  errorCode: string
  details?: unknown

  constructor(statusCode: number, errorCode: string, message: string, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Solicitud invalida', details?: unknown) {
    super(400, 'BAD_REQUEST', message, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado', details?: unknown) {
    super(404, 'NOT_FOUND', message, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado', details?: unknown) {
    super(401, 'UNAUTHORIZED', message, details)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado', details?: unknown) {
    super(403, 'FORBIDDEN', message, details)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto', details?: unknown) {
    super(409, 'CONFLICT', message, details)
  }
}
