import type { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as mapService from './map.service.js';

export const getPositions = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!;
  const filters = {
    status: req.query.status as string | undefined,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    search: req.query.search as string | undefined,
  };
  const data = await mapService.getPositions(tenant_id, filters);
  res.json(data);
});

export const getClusters = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!;
  const bounds = {
    sw_lat: req.query.sw_lat ? Number(req.query.sw_lat) : -90,
    sw_lng: req.query.sw_lng ? Number(req.query.sw_lng) : -180,
    ne_lat: req.query.ne_lat ? Number(req.query.ne_lat) : 90,
    ne_lng: req.query.ne_lng ? Number(req.query.ne_lng) : 180,
    zoom: req.query.zoom ? Number(req.query.zoom) : 10,
  };
  const filters = {
    status: req.query.status as string | undefined,
  };
  const data = await mapService.getClusters(tenant_id, bounds, filters);
  res.json(data);
});

export const getTruckInfo = asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = req.tenant_id!;
  const truckId = Number(req.params.id);
  const data = await mapService.getTruckInfo(tenant_id, truckId);
  res.json(data);
});
