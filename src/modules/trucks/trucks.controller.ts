import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import * as truckService from './trucks.service.js'

export const list = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status as any,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    search: req.query.search as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  }
  const result = await truckService.findAll(req.tenant_id!, filters)
  res.json(result)
})

export const getById = asyncHandler(async (req, res) => {
  const truck = await truckService.findById(req.tenant_id!, Number(req.params.id))
  res.json(truck)
})

export const create = asyncHandler(async (req, res) => {
  const truck = await truckService.create(req.tenant_id!, req.body)
  res.status(201).json(truck)
})

export const update = asyncHandler(async (req, res) => {
  const truck = await truckService.update(req.tenant_id!, Number(req.params.id), req.body)
  res.json(truck)
})

export const remove = asyncHandler(async (req, res) => {
  await truckService.remove(req.tenant_id!, Number(req.params.id))
  res.status(204).end()
})

export const getLastPosition = asyncHandler(async (req, res) => {
  const position = await truckService.getLastPosition(req.tenant_id!, Number(req.params.id))
  res.json(position)
})

export const getPositionHistory = asyncHandler(async (req, res) => {
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined
  const positions = await truckService.getPositionHistory(req.tenant_id!, Number(req.params.id), from, to)
  res.json(positions)
})

export const getStats = asyncHandler(async (req, res) => {
  const stats = await truckService.getStats(req.tenant_id!)
  res.json(stats)
})
