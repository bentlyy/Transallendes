import { Request, Response, NextFunction } from 'express';
import * as tripService from './trips.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const filters = {
      status: req.query.status as string | undefined,
      client_id: req.query.client_id ? parseInt(req.query.client_id as string, 10) : undefined,
      driver_id: req.query.driver_id ? parseInt(req.query.driver_id as string, 10) : undefined,
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await tripService.findAll(tenant_id, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const id = parseInt(req.params.id as string, 10);
    const trip = await tripService.findById(tenant_id, id);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const trip = await tripService.create(tenant_id, req.body);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const id = parseInt(req.params.id as string, 10);
    const trip = await tripService.update(tenant_id, id, req.body);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const id = parseInt(req.params.id as string, 10);
    await tripService.remove(tenant_id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const id = parseInt(req.params.id as string, 10);
    const { status } = req.body;
    const trip = await tripService.updateStatus(tenant_id, id, status);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

export async function getPositions(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const tripId = parseInt(req.params.id as string, 10);
    const positions = await tripService.getTripPositions(tenant_id, tripId);
    res.json(positions);
  } catch (err) {
    next(err);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant_id = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
    const stats = await tripService.getStats(tenant_id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}
