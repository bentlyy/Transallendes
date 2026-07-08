import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createGeofenceSchema, updateGeofenceSchema } from './geofences.schema.js';
import * as geofenceController from './geofences.controller.js';

const router = Router();

router.get('/', asyncHandler(geofenceController.list));
router.get('/nearby', asyncHandler(geofenceController.findNearby));
router.get('/:id', asyncHandler(geofenceController.getById));
router.post('/', validateZod(createGeofenceSchema), asyncHandler(geofenceController.create));
router.put('/:id', validateZod(updateGeofenceSchema), asyncHandler(geofenceController.update));
router.delete('/:id', asyncHandler(geofenceController.remove));

export default router;
