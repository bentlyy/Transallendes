import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import * as billingService from './billing.service.js'

export const list = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status as string | undefined,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  }
  const result = await billingService.findAll(req.tenant_id!, filters)
  res.json(result)
})

export const getById = asyncHandler(async (req, res) => {
  const invoice = await billingService.findById(req.tenant_id!, Number(req.params.id))
  res.json(invoice)
})

export const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.createInvoice(req.tenant_id!, req.body)
  res.status(201).json(invoice)
})

export const updateStatus = asyncHandler(async (req, res) => {
  const invoice = await billingService.updateStatus(req.tenant_id!, Number(req.params.id), req.body)
  res.json(invoice)
})

export const getStats = asyncHandler(async (req, res) => {
  const stats = await billingService.getStats(req.tenant_id!)
  res.json(stats)
})
