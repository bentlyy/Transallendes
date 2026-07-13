import { Router } from 'express'
import { list, getById, createInvoice, updateStatus, getStats } from './billing.controller.js'
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { createInvoiceSchema, updateInvoiceStatusSchema } from './billing.schema.js'

const router = Router()

router.get('/', authMiddleware, list)
router.get('/stats', authMiddleware, getStats)
router.get('/:id', authMiddleware, getById)
router.post('/', authMiddleware, authorize('admin'), validateZod(createInvoiceSchema), createInvoice)
router.patch('/:id/status', authMiddleware, authorize('admin'), validateZod(updateInvoiceStatusSchema), updateStatus)

export default router
