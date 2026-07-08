import api from './axios'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  link?: string
  createdAt: string
}

export async function getNotifications(params?: Record<string, string>): Promise<{ data: Notification[]; total: number; unreadCount: number }> {
  const res = await api.get('/notifications', { params })
  return res.data
}

export async function markRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllRead(): Promise<void> {
  await api.patch('/notifications/read-all')
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await api.get('/notifications/unread-count')
  return res.data
}
