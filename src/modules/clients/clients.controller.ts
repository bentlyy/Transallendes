import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import * as clientService from './clients.service.js'

export const list = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  }
  const result = await clientService.findAll(req.tenant_id!, filters)
  res.json(result)
})

export const getById = asyncHandler(async (req, res) => {
  const client = await clientService.findById(req.tenant_id!, Number(req.params.id))
  res.json(client)
})

export const create = asyncHandler(async (req, res) => {
  const client = await clientService.create(req.tenant_id!, req.body)
  res.status(201).json(client)
})

export const update = asyncHandler(async (req, res) => {
  const client = await clientService.update(req.tenant_id!, Number(req.params.id), req.body)
  res.json(client)
})

export const remove = asyncHandler(async (req, res) => {
  await clientService.remove(req.tenant_id!, Number(req.params.id))
  res.status(204).end()
})

export const getClientTrips = asyncHandler(async (req, res) => {
  const trips = await clientService.getClientTrips(req.tenant_id!, Number(req.params.id))
  res.json(trips)
})

export const getClientTrucks = asyncHandler(async (req, res) => {
  const trucks = await clientService.getClientTrucks(req.tenant_id!, Number(req.params.id))
  res.json(trucks)
})

export const getClientStats = asyncHandler(async (req, res) => {
  const stats = await clientService.getClientStats(req.tenant_id!, Number(req.params.id))
  res.json(stats)
})
