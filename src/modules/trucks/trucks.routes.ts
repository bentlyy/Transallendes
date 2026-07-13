import { Router } from 'express'
import {
  list,
  getById,
  create,
  update,
  remove,
  getLastPosition,
  getPositionHistory,
  getStats,
} from './trucks.controller.js'
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { createTruckSchema, updateTruckSchema } from './trucks.schema.js'

const router = Router()

router.get('/', authMiddleware, list)
router.get('/stats', authMiddleware, getStats)
router.get('/:id', authMiddleware, getById)
router.post('/', authMiddleware, authorize('admin'), validateZod(createTruckSchema), create)
router.put('/:id', authMiddleware, authorize('admin'), validateZod(updateTruckSchema), update)
router.delete('/:id', authMiddleware, authorize('admin'), remove)
router.get('/:id/positions', authMiddleware, getPositionHistory)
router.get('/:id/positions/last', authMiddleware, getLastPosition)

export default router
