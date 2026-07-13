import { Router } from 'express'
import { list, getById, create, update, remove, getDriverTrips, getStats } from './drivers.controller.js'
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { createDriverSchema, updateDriverSchema } from './drivers.schema.js'

const router = Router()

router.get('/', authMiddleware, list)
router.get('/stats', authMiddleware, getStats)
router.get('/:id', authMiddleware, getById)
router.post('/', authMiddleware, authorize('admin'), validateZod(createDriverSchema), create)
router.put('/:id', authMiddleware, authorize('admin'), validateZod(updateDriverSchema), update)
router.delete('/:id', authMiddleware, authorize('admin'), remove)
router.get('/:id/trips', authMiddleware, getDriverTrips)

export default router
