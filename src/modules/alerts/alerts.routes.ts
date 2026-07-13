import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { acknowledgeAlertSchema } from './alerts.schema.js'
import * as alertController from './alerts.controller.js'

const router = Router()

router.get('/', authMiddleware, asyncHandler(alertController.list))
router.get('/stats', authMiddleware, asyncHandler(alertController.getStats))
router.get('/:id', authMiddleware, asyncHandler(alertController.getById))
router.patch('/:id/acknowledge', authMiddleware, validateZod(acknowledgeAlertSchema), asyncHandler(alertController.acknowledge))
router.patch('/:id/resolve', authMiddleware, asyncHandler(alertController.resolve))

export default router
