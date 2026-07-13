import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { createGeofenceSchema, updateGeofenceSchema } from './geofences.schema.js'
import * as geofenceController from './geofences.controller.js'

const router = Router()

router.get('/', authMiddleware, asyncHandler(geofenceController.list))
router.get('/nearby', authMiddleware, asyncHandler(geofenceController.findNearby))
router.get('/:id', authMiddleware, asyncHandler(geofenceController.getById))
router.post('/', authMiddleware, authorize('admin'), validateZod(createGeofenceSchema), asyncHandler(geofenceController.create))
router.put('/:id', authMiddleware, authorize('admin'), validateZod(updateGeofenceSchema), asyncHandler(geofenceController.update))
router.delete('/:id', authMiddleware, authorize('admin'), asyncHandler(geofenceController.remove))

export default router
