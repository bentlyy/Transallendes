import { Request, Response, NextFunction } from 'express';
import * as geofenceService from './geofences.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const geofences = await geofenceService.findAll(tenant_id);
    res.json(geofences);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const id = parseInt(req.params.id as string, 10);
    const geofence = await geofenceService.findById(tenant_id, id);
    res.json(geofence);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const geofence = await geofenceService.create(tenant_id, req.body);
    res.status(201).json(geofence);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const id = parseInt(req.params.id as string, 10);
    const geofence = await geofenceService.update(tenant_id, id, req.body);
    res.json(geofence);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const id = parseInt(req.params.id as string, 10);
    await geofenceService.remove(tenant_id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function findNearby(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius_meters = parseFloat(req.query.radius_meters as string) || 1000;
    const geofences = await geofenceService.findNearby(tenant_id, lat, lng, radius_meters);
    res.json(geofences);
  } catch (err) {
    next(err);
  }
}
