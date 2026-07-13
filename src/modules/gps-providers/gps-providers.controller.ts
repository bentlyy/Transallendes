import type { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import * as gpsService from './gps-providers.service.js'

export const ingest = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!
  const result = await gpsService.ingestPosition(tenant_id, req.body)
  res.status(201).json({ success: true, data: result })
})

export const batchIngest = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!
  const result = await gpsService.batchIngest(tenant_id, req.body)
  res.status(201).json({ success: true, data: result })
})
