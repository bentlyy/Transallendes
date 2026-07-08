import { Router } from 'express';
import { list, getById, create, update, remove, getUpcoming } from './maintenance.controller.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createMaintenanceSchema, updateMaintenanceSchema } from './maintenance.schema.js';

const router = Router();

router.get('/', authMiddleware, list);
router.get('/upcoming', authMiddleware, getUpcoming);
router.get('/:id', authMiddleware, getById);
router.post('/', authMiddleware, authorize('admin'), validateZod(createMaintenanceSchema), create);
router.put('/:id', authMiddleware, authorize('admin'), validateZod(updateMaintenanceSchema), update);
router.delete('/:id', authMiddleware, authorize('admin'), remove);

export default router;
