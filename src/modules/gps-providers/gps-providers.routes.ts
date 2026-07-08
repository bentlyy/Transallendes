import { Router } from 'express';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { ingestSchema, batchIngestSchema } from './gps-providers.schema.js';
import * as controller from './gps-providers.controller.js';

const router = Router();

router.post('/ingest', validateZod(ingestSchema), controller.ingest);
router.post('/batch', validateZod(batchIngestSchema), controller.batchIngest);

export default router;
