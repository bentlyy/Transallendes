import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as maintenanceService from './maintenance.service.js';

export const list = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status as string | undefined,
    truck_id: req.query.truck_id ? Number(req.query.truck_id) : undefined,
    type: req.query.type as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  };
  const result = await maintenanceService.findAll(req.tenant_id!, filters);
  res.json(result);
});

export const getById = asyncHandler(async (req, res) => {
  const record = await maintenanceService.findById(req.tenant_id!, Number(req.params.id));
  res.json(record);
});

export const create = asyncHandler(async (req, res) => {
  const record = await maintenanceService.create(req.tenant_id!, req.body);
  res.status(201).json(record);
});

export const update = asyncHandler(async (req, res) => {
  const record = await maintenanceService.update(req.tenant_id!, Number(req.params.id), req.body);
  res.json(record);
});

export const remove = asyncHandler(async (req, res) => {
  await maintenanceService.remove(req.tenant_id!, Number(req.params.id));
  res.status(204).end();
});

export const getUpcoming = asyncHandler(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const records = await maintenanceService.getUpcoming(req.tenant_id!, days);
  res.json(records);
});
