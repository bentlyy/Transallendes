export class AppError extends Error {
  statusCode: number
  errorCode: string
  details?: Record<string, unknown>

  constructor(statusCode: number, errorCode: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: Record<string, unknown>) {
    super(400, 'BAD_REQUEST', message, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super(404, 'NOT_FOUND', message, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(401, 'UNAUTHORIZED', message, details)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(403, 'FORBIDDEN', message, details)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super(409, 'CONFLICT', message, details)
  }
}
