import { Router } from 'express'
import { findByUser, getUnreadCount, markRead, markAllRead } from './notifications.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const router = Router()

router.get('/', authMiddleware, findByUser)
router.get('/unread-count', authMiddleware, getUnreadCount)
router.patch('/read-all', authMiddleware, markAllRead)
router.patch('/:id/read', authMiddleware, markRead)

export default router
