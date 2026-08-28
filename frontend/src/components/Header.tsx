import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { formatRelativeTime } from '@/utils/formatters'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markRead } = useNotifications()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const roleLabel: Record<string, string> = {
    superadmin: 'Super Administrador',
    admin: 'Administrador',
    client: 'Cliente',
    driver: 'Conductor',
  }

  const avatarColors: Record<string, string> = {
    superadmin: '#7c3aed',
    admin: '#2563eb',
    client: '#16a34a',
    driver: '#f59e0b',
  }

  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <header className="app-header">
      {/* Search bar */}
      <div className="search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--muted-light)' }}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" placeholder="Buscar vehículos, conductores, viajes..." />
      </div>

      <div className="header-actions">
        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setShowNotifPanel(!showNotifPanel)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className="notif-dot" />}
          </button>

          {showNotifPanel && (
            <div className="dropdown" style={{ width: 380, maxHeight: 460 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>Notificaciones</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{unreadCount} sin leer</span>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.read) markRead(n.id) }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        backgroundColor: n.read ? 'transparent' : 'var(--primary-light)',
                        borderBottom: '1px solid var(--border-light)',
                        transition: 'background-color 0.1s',
                      }}
                      className="dropdown-item-hover"
                    >
                      <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--foreground)' }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-light)', marginTop: 4 }}>{formatRelativeTime(n.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{ width: 'auto', padding: '4px 8px', gap: 8, borderRadius: 9999, border: '1px solid var(--border)' }}
          >
            <div
              className="user-avatar"
              style={{ backgroundColor: avatarColors[user?.role || ''] || '#64748b' }}
            >
              {initials}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', display: 'none' }} className="user-name-desktop">{user?.name}</span>
          </button>

          {showUserMenu && (
            <div className="dropdown">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{user?.email}</div>
                <span style={{
                  display: 'inline-block',
                  marginTop: 6,
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 9999,
                  backgroundColor: `${avatarColors[user?.role || '']}20`,
                  color: avatarColors[user?.role || ''],
                }}>
                  {roleLabel[user?.role || ''] || user?.role}
                </span>
              </div>

              <button
                className="dropdown-item"
                onClick={() => {
                  setShowUserMenu(false)
                  if (user?.role === 'client') navigate('/portal/settings')
                  else if (user?.role === 'superadmin') navigate('/super-admin/settings')
                  else navigate('/admin/settings')
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Configuración
              </button>

              <div className="dropdown-divider" />

              <button
                className="dropdown-item dropdown-item--danger"
                onClick={async () => {
                  setShowUserMenu(false)
                  await logout()
                  navigate('/login')
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .user-name-desktop { display: inline !important; }
        }
        .dropdown-item-hover:hover {
          background-color: var(--background) !important;
        }
      `}</style>
    </header>
  )
}
