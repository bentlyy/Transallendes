import type { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as analyticsService from './analytics.service.js';

export const getExecutiveDashboard = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!;
  const filters = {
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    driver_id: req.query.driver_id ? Number(req.query.driver_id) : undefined,
  };
  const data = await analyticsService.getExecutiveDashboard(tenant_id, filters);
  res.json(data);
});

export const getOperationalDashboard = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!;
  const filters = {
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    driver_id: req.query.driver_id ? Number(req.query.driver_id) : undefined,
  };
  const data = await analyticsService.getOperationalDashboard(tenant_id, filters);
  res.json(data);
});

export const getClientDashboard = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!;
  const clientId = Number(req.params.id);
  const filters = {
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  };
  const data = await analyticsService.getClientDashboard(tenant_id, clientId, filters);
  res.json(data);
});

export const getDriverRankings = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!;
  const filters = {
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    driver_id: req.query.driver_id ? Number(req.query.driver_id) : undefined,
  };
  const data = await analyticsService.getDriverRankings(tenant_id, filters);
  res.json(data);
});

export const getClientRankings = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!;
  const filters = {
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    driver_id: req.query.driver_id ? Number(req.query.driver_id) : undefined,
  };
  const data = await analyticsService.getClientRankings(tenant_id, filters);
  res.json(data);
});
