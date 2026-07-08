import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as superAdminService from './super-admin.service.js';

export const getTenants = asyncHandler(async (req, res) => {
  const tenants = await superAdminService.getTenants();
  res.json(tenants);
});

export const getTenantById = asyncHandler(async (req, res) => {
  const tenant = await superAdminService.getTenantById(req.params.id as string);
  res.json(tenant);
});

export const createTenant = asyncHandler(async (req, res) => {
  const tenant = await superAdminService.createTenant(req.body);
  res.status(201).json(tenant);
});

export const updateTenant = asyncHandler(async (req, res) => {
  const tenant = await superAdminService.updateTenant(req.params.id as string, req.body);
  res.json(tenant);
});

export const deleteTenant = asyncHandler(async (req, res) => {
  await superAdminService.deleteTenant(req.params.id as string);
  res.status(204).end();
});

export const getUsers = asyncHandler(async (req, res) => {
  const users = await superAdminService.getUsers();
  res.json(users);
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await superAdminService.getStats();
  res.json(stats);
});
