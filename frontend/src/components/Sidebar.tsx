import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { USER_ROLES } from '@/utils/constants'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavItem {
  path: string
  label: string
  icon: string
}

type NavEntry = (NavItem & { section?: undefined }) | { section: string }

const ICONS: Record<string, string> = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  driver: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  trip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  client: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  geofence: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  maintenance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  billing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  tenant: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  collapseLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  collapseRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
}

const ADMIN_NAV: NavEntry[] = [
  { section: 'Principal' },
  { path: '/admin/dashboard', label: 'Panel', icon: 'dashboard' },
  { path: '/admin/map', label: 'Mapa', icon: 'map' },
  { section: 'Gestión' },
  { path: '/admin/trucks', label: 'Vehículos', icon: 'truck' },
  { path: '/admin/drivers', label: 'Conductores', icon: 'driver' },
  { path: '/admin/trips', label: 'Viajes', icon: 'trip' },
  { path: '/admin/clients', label: 'Clientes', icon: 'client' },
  { section: 'Monitoreo' },
  { path: '/admin/geofences', label: 'Geocercas', icon: 'geofence' },
  { path: '/admin/alerts', label: 'Alertas', icon: 'alert' },
  { path: '/admin/reports', label: 'Reportes', icon: 'report' },
  { path: '/admin/maintenance', label: 'Mantenimiento', icon: 'maintenance' },
  { section: 'Configuración' },
  { path: '/admin/settings', label: 'Ajustes', icon: 'settings' },
]

const CLIENT_NAV: NavEntry[] = [
  { section: 'Principal' },
  { path: '/portal/map', label: 'Mapa', icon: 'map' },
  { path: '/portal/dashboard', label: 'Panel', icon: 'dashboard' },
  { section: 'Gestión' },
  { path: '/portal/trips', label: 'Viajes', icon: 'trip' },
  { path: '/portal/trucks', label: 'Vehículos', icon: 'truck' },
  { path: '/portal/alerts', label: 'Alertas', icon: 'alert' },
  { path: '/portal/documents', label: 'Documentos', icon: 'document' },
  { path: '/portal/reports', label: 'Reportes', icon: 'report' },
  { section: 'Configuración' },
  { path: '/portal/settings', label: 'Ajustes', icon: 'settings' },
]

const SUPER_ADMIN_NAV: NavEntry[] = [
  { section: 'Super Administrador' },
  { path: '/super-admin/tenants', label: 'Empresas', icon: 'tenant' },
  { path: '/super-admin/users', label: 'Usuarios', icon: 'users' },
  { section: 'Configuración' },
  { path: '/super-admin/settings', label: 'Ajustes', icon: 'settings' },
]

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth()
  const location = useLocation()

  let navItems: NavEntry[]
  let logoText = ''
  if (user?.role === USER_ROLES.SUPER_ADMIN) {
    navItems = SUPER_ADMIN_NAV
    logoText = 'Super Administrador'
  } else if (user?.role === USER_ROLES.CLIENT) {
    navItems = CLIENT_NAV
    logoText = 'Mi Portal'
  } else {
    navItems = ADMIN_NAV
    logoText = 'Transporte'
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

  function toggleTheme() {
    const newTheme = isDark ? 'light' : 'dark'
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <aside
      className="sidebar"
      style={{ width: collapsed ? 64 : 260 }}
    >
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="sidebar-logo-icon">T</div>
              <span className="sidebar-logo-text">{logoText}</span>
            </div>
            <button onClick={onToggle} className="icon-btn" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span dangerouslySetInnerHTML={{ __html: ICONS.collapseLeft! }} />
            </button>
          </>
        ) : (
          <>
            <div className="sidebar-logo-icon" style={{ margin: '0 auto' }}>T</div>
            <button onClick={onToggle} className="icon-btn" style={{ position: 'absolute', right: -12, top: 20, color: 'rgba(255,255,255,0.4)' }}>
              <span dangerouslySetInnerHTML={{ __html: ICONS.collapseRight! }} />
            </button>
          </>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          if ('section' in item) {
            return collapsed ? null : (
              <div key={`section-${idx}`} className="sidebar-section-label">{item.section}</div>
            )
          }
          const isActive = location.pathname.startsWith(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-link-icon" dangerouslySetInnerHTML={{ __html: ICONS[item.icon]! }} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={toggleTheme}
          className="sidebar-link"
          style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: 'inherit', fontSize: 14 }}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          <span className="sidebar-link-icon" dangerouslySetInnerHTML={{ __html: (isDark ? ICONS.sun : ICONS.moon)! }} />
          {!collapsed && <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>
      </div>
    </aside>
  )
}
