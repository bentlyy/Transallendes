import { Router } from 'express';
import { generate, list, getById, downloadReport } from './reports.controller.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { generateReportSchema } from './reports.schema.js';

const router = Router();

router.post('/generate', authMiddleware, authorize('admin'), validateZod(generateReportSchema), generate);
router.get('/', authMiddleware, list);
router.get('/:id', authMiddleware, getById);
router.get('/:id/download', authMiddleware, downloadReport);

export default router;
