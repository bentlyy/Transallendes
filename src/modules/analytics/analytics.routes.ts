import { Router } from 'express';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { analyticsQuerySchema } from './analytics.schema.js';
import * as controller from './analytics.controller.js';

const router = Router();

router.get('/executive', validateZod(analyticsQuerySchema, 'query'), controller.getExecutiveDashboard);
router.get('/operational', validateZod(analyticsQuerySchema, 'query'), controller.getOperationalDashboard);
router.get('/client/:id', validateZod(analyticsQuerySchema, 'query'), controller.getClientDashboard);
router.get('/rankings/drivers', validateZod(analyticsQuerySchema, 'query'), controller.getDriverRankings);
router.get('/rankings/clients', validateZod(analyticsQuerySchema, 'query'), controller.getClientRankings);

export default router;
