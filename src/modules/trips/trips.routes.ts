import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createTripSchema, updateTripSchema, updateTripStatusSchema } from './trips.schema.js';
import * as tripController from './trips.controller.js';

const router = Router();

router.get('/', asyncHandler(tripController.list));
router.get('/stats', asyncHandler(tripController.getStats));
router.get('/:id', asyncHandler(tripController.getById));
router.post('/', validateZod(createTripSchema), asyncHandler(tripController.create));
router.put('/:id', validateZod(updateTripSchema), asyncHandler(tripController.update));
router.delete('/:id', asyncHandler(tripController.remove));
router.patch('/:id/status', validateZod(updateTripStatusSchema), asyncHandler(tripController.updateStatus));
router.get('/:id/positions', asyncHandler(tripController.getPositions));

export default router;
