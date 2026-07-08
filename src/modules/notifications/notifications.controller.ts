import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as notificationService from './notifications.service.js';

export const findByUser = asyncHandler(async (req, res) => {
  const notifications = await notificationService.findByUser(req.tenant_id!, req.user!.id);
  res.json(notifications);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.tenant_id!, req.user!.id);
  res.json(count);
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.tenant_id!, Number(req.params.id), req.user!.id);
  res.json(notification);
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.tenant_id!, req.user!.id);
  res.json(result);
});
