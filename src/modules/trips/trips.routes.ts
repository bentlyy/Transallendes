import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { createTripSchema, updateTripSchema, updateTripStatusSchema } from './trips.schema.js'
import * as tripController from './trips.controller.js'

const router = Router()

router.get('/', authMiddleware, asyncHandler(tripController.list))
router.get('/stats', authMiddleware, asyncHandler(tripController.getStats))
router.get('/:id', authMiddleware, asyncHandler(tripController.getById))
router.post('/', authMiddleware, authorize('admin'), validateZod(createTripSchema), asyncHandler(tripController.create))
router.put('/:id', authMiddleware, authorize('admin'), validateZod(updateTripSchema), asyncHandler(tripController.update))
router.delete('/:id', authMiddleware, authorize('admin'), asyncHandler(tripController.remove))
router.patch('/:id/status', authMiddleware, validateZod(updateTripStatusSchema), asyncHandler(tripController.updateStatus))
router.get('/:id/positions', authMiddleware, asyncHandler(tripController.getPositions))

export default router
