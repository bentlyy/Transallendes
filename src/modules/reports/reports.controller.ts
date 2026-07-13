import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import * as reportService from './reports.service.js'

export const generate = asyncHandler(async (req, res) => {
  const report = await reportService.generate(req.tenant_id!, req.user!.id, req.body)
  res.status(201).json(report)
})

export const list = asyncHandler(async (req, res) => {
  const reports = await reportService.findAll(req.tenant_id!)
  res.json(reports)
})

export const getById = asyncHandler(async (req, res) => {
  const report = await reportService.findById(req.tenant_id!, Number(req.params.id))
  res.json(report)
})

export const downloadReport = asyncHandler(async (req, res) => {
  const report = await reportService.download(req.tenant_id!, Number(req.params.id))
  res.json(report)
})
