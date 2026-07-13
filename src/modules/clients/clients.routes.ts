import { Router } from 'express'
import {
  list,
  getById,
  create,
  update,
  remove,
  getClientTrips,
  getClientTrucks,
  getClientStats,
} from './clients.controller.js'
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { createClientSchema, updateClientSchema } from './clients.schema.js'

const router = Router()

router.get('/', authMiddleware, list)
router.get('/:id', authMiddleware, getById)
router.post('/', authMiddleware, authorize('admin'), validateZod(createClientSchema), create)
router.put('/:id', authMiddleware, authorize('admin'), validateZod(updateClientSchema), update)
router.delete('/:id', authMiddleware, authorize('admin'), remove)
router.get('/:id/trips', authMiddleware, getClientTrips)
router.get('/:id/trucks', authMiddleware, getClientTrucks)
router.get('/:id/stats', authMiddleware, getClientStats)

export default router
