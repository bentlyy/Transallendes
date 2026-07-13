import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { analyticsQuerySchema } from './analytics.schema.js'
import * as controller from './analytics.controller.js'

const router = Router()

router.get('/executive', authMiddleware, validateZod(analyticsQuerySchema, 'query'), controller.getExecutiveDashboard)
router.get('/operational', authMiddleware, validateZod(analyticsQuerySchema, 'query'), controller.getOperationalDashboard)
router.get('/client/:id', authMiddleware, validateZod(analyticsQuerySchema, 'query'), controller.getClientDashboard)
router.get('/rankings/drivers', authMiddleware, validateZod(analyticsQuerySchema, 'query'), controller.getDriverRankings)
router.get('/rankings/clients', authMiddleware, validateZod(analyticsQuerySchema, 'query'), controller.getClientRankings)

export default router
