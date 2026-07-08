import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { acknowledgeAlertSchema } from './alerts.schema.js';
import * as alertController from './alerts.controller.js';

const router = Router();

router.get('/', asyncHandler(alertController.list));
router.get('/stats', asyncHandler(alertController.getStats));
router.get('/:id', asyncHandler(alertController.getById));
router.patch('/:id/acknowledge', validateZod(acknowledgeAlertSchema), asyncHandler(alertController.acknowledge));
router.patch('/:id/resolve', asyncHandler(alertController.resolve));

export default router;
