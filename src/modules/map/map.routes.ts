import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { validateZod } from '../../middlewares/validate.middleware.js'
import { clustersQuerySchema, truckInfoParamsSchema } from './map.schema.js'
import * as controller from './map.controller.js'

const router = Router()

router.get('/positions', authMiddleware, controller.getPositions)
router.get('/clusters', authMiddleware, validateZod(clustersQuerySchema, 'query'), controller.getClusters)
router.get('/trucks/:id', authMiddleware, validateZod(truckInfoParamsSchema, 'params'), controller.getTruckInfo)

export default router
