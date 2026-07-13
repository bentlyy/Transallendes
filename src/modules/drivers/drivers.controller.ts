import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import * as driverService from './drivers.service.js'

export const list = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status as any,
    search: req.query.search as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  }
  const result = await driverService.findAll(req.tenant_id!, filters)
  res.json(result)
})

export const getById = asyncHandler(async (req, res) => {
  const driver = await driverService.findById(req.tenant_id!, Number(req.params.id))
  res.json(driver)
})

export const create = asyncHandler(async (req, res) => {
  const driver = await driverService.create(req.tenant_id!, req.body)
  res.status(201).json(driver)
})

export const update = asyncHandler(async (req, res) => {
  const driver = await driverService.update(req.tenant_id!, Number(req.params.id), req.body)
  res.json(driver)
})

export const remove = asyncHandler(async (req, res) => {
  await driverService.remove(req.tenant_id!, Number(req.params.id))
  res.status(204).end()
})

export const getDriverTrips = asyncHandler(async (req, res) => {
  const trips = await driverService.getDriverTrips(req.tenant_id!, Number(req.params.id))
  res.json(trips)
})

export const getStats = asyncHandler(async (req, res) => {
  const stats = await driverService.getStats(req.tenant_id!)
  res.json(stats)
})
