import { createContext, useState, useEffect, useCallback, useContext, type ReactNode } from 'react'
import { AuthContext } from '@/context/AuthContext'
import { getNotifications, markRead as apiMarkRead, markAllRead as apiMarkAllRead, type Notification } from '@/api/notifications'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  refresh: () => Promise<void>
}

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markRead: async () => {},
  markAllRead: async () => {},
  refresh: async () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useContext(AuthContext)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const res = await getNotifications({ limit: '50' })
      setNotifications(res.data)
      setUnreadCount(res.unreadCount)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  const markRead = useCallback(async (id: string) => {
    await apiMarkRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await apiMarkAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, markRead, markAllRead, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
