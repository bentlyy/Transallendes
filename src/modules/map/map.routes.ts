import { Router } from 'express';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { clustersQuerySchema, truckInfoParamsSchema } from './map.schema.js';
import * as controller from './map.controller.js';

const router = Router();

router.get('/positions', controller.getPositions);
router.get('/clusters', validateZod(clustersQuerySchema, 'query'), controller.getClusters);
router.get('/trucks/:id', validateZod(truckInfoParamsSchema, 'params'), controller.getTruckInfo);

export default router;
