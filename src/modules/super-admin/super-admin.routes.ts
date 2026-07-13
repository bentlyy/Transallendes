import { Router } from 'express'
import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getUsers,
  getStats,
} from './super-admin.controller.js'
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { createTenantSchema, updateTenantSchema } from './super-admin.schema.js'

const router = Router()

router.use(authMiddleware, authorize('superadmin'))

router.get('/tenants', getTenants)
router.get('/tenants/:id', getTenantById)
router.post('/tenants', validateZod(createTenantSchema), createTenant)
router.put('/tenants/:id', validateZod(updateTenantSchema), updateTenant)
router.delete('/tenants/:id', deleteTenant)
router.get('/users', getUsers)
router.get('/stats', getStats)

export default router
