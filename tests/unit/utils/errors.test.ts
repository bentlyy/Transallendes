import { describe, it, expect } from 'vitest'
import { AppError, BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '../../../src/utils/errors.js'

describe('AppError', () => {
  it('should create with statusCode, errorCode and message', () => {
    const err = new AppError(400, 'TEST_ERROR', 'Test error message', { detail: 'value' })
    expect(err.statusCode).toBe(400)
    expect(err.errorCode).toBe('TEST_ERROR')
    expect(err.message).toBe('Test error message')
    expect(err.details).toEqual({ detail: 'value' })
  })

  it('should have a stack trace', () => {
    const err = new AppError(500, 'INTERNAL', 'Internal')
    expect(err.stack).toBeDefined()
  })
})

describe('BadRequestError', () => {
  it('should have 400 status and BAD_REQUEST code', () => {
    const err = new BadRequestError('Invalid input', { field: 'email' })
    expect(err.statusCode).toBe(400)
    expect(err.errorCode).toBe('BAD_REQUEST')
    expect(err.message).toBe('Invalid input')
    expect(err.details).toEqual({ field: 'email' })
  })

  it('should use default message', () => {
    const err = new BadRequestError()
    expect(err.message).toBe('Bad request')
  })
})

describe('NotFoundError', () => {
  it('should have 404 status and NOT_FOUND code', () => {
    const err = new NotFoundError('User not found')
    expect(err.statusCode).toBe(404)
    expect(err.errorCode).toBe('NOT_FOUND')
  })
})

describe('UnauthorizedError', () => {
  it('should have 401 status and UNAUTHORIZED code', () => {
    const err = new UnauthorizedError()
    expect(err.statusCode).toBe(401)
    expect(err.errorCode).toBe('UNAUTHORIZED')
  })
})

describe('ForbiddenError', () => {
  it('should have 403 status and FORBIDDEN code', () => {
    const err = new ForbiddenError('Access denied')
    expect(err.statusCode).toBe(403)
    expect(err.errorCode).toBe('FORBIDDEN')
  })
})

describe('ConflictError', () => {
  it('should have 409 status and CONFLICT code', () => {
    const err = new ConflictError('Duplicate entry')
    expect(err.statusCode).toBe(409)
    expect(err.errorCode).toBe('CONFLICT')
  })
})
