import { Request, Response, NextFunction } from 'express'
import * as alertService from './alerts.service.js'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = (req.user?.tenant_id || req.headers['x-tenant-id'] || '') as string
    const filters = {
      type: req.query.type as string | undefined,
      severity: req.query.severity as string | undefined,
      resolved: req.query.resolved !== undefined ? req.query.resolved === 'true' : undefined,
      truck_id: req.query.truck_id ? parseInt(req.query.truck_id as string, 10) : undefined,
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    }

    const result = await alertService.findAll(tenant_id, filters)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = (req.user?.tenant_id || req.headers['x-tenant-id'] || '') as string
    const id = parseInt(req.params.id as string, 10)
    const alert = await alertService.findById(tenant_id, id)
    res.json(alert)
  } catch (err) {
    next(err)
  }
}

export async function acknowledge(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = (req.user?.tenant_id || req.headers['x-tenant-id'] || '') as string
    const id = parseInt(req.params.id as string, 10)
    const userId = req.body.acknowledged_by || req.user?.id
    const alert = await alertService.acknowledge(tenant_id, id, userId)
    res.json(alert)
  } catch (err) {
    next(err)
  }
}

export async function resolve(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = (req.user?.tenant_id || req.headers['x-tenant-id'] || '') as string
    const id = parseInt(req.params.id as string, 10)
    const alert = await alertService.resolve(tenant_id, id)
    res.json(alert)
  } catch (err) {
    next(err)
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || (req.headers['x-tenant-id'] as string)
    const stats = await alertService.getStats(tenant_id)
    res.json(stats)
  } catch (err) {
    next(err)
  }
}
