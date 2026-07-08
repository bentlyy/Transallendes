export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  ADMIN: {
    MAP: '/admin/map',
    DASHBOARD: '/admin/dashboard',
    TRUCKS: '/admin/trucks',
    TRUCK_DETAIL: '/admin/trucks/:id',
    DRIVERS: '/admin/drivers',
    DRIVER_DETAIL: '/admin/drivers/:id',
    TRIPS: '/admin/trips',
    TRIP_DETAIL: '/admin/trips/:id',
    CLIENTS: '/admin/clients',
    CLIENT_DETAIL: '/admin/clients/:id',
    GEOFENCES: '/admin/geofences',
    ALERTS: '/admin/alerts',
    REPORTS: '/admin/reports',
    MAINTENANCE: '/admin/maintenance',
    SETTINGS: '/admin/settings',
  },
  CLIENT: {
    MAP: '/portal/map',
    DASHBOARD: '/portal/dashboard',
    TRIPS: '/portal/trips',
    TRIP_DETAIL: '/portal/trips/:id',
    TRUCKS: '/portal/trucks',
    ALERTS: '/portal/alerts',
    DOCUMENTS: '/portal/documents',
    REPORTS: '/portal/reports',
    SETTINGS: '/portal/settings',
  },
  SUPER_ADMIN: {
    TENANTS: '/super-admin/tenants',
    TENANT_DETAIL: '/super-admin/tenants/:id',
    USERS: '/super-admin/users',
    SETTINGS: '/super-admin/settings',
  },
} as const

export const TRUCK_STATUS = {
  MOVING: 'moving',
  STOPPED: 'stopped',
  IDLE: 'idle',
  ENGINE_OFF: 'engine_off',
  ALERT: 'alert',
  DISCONNECTED: 'disconnected',
} as const

export const TRIP_STATUS = {
  PLANNED: 'planned',
  ASSIGNED: 'assigned',
  LOADING: 'loading',
  IN_PROGRESS: 'in_progress',
  RESTING: 'resting',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DELAYED: 'delayed',
} as const

export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const

export const ALERT_TYPE = {
  SPEEDING: 'speeding',
  GEOFENCE: 'geofence',
  MAINTENANCE: 'maintenance',
  FUEL: 'fuel',
  TEMPERATURE: 'temperature',
  DRIVER: 'driver',
  SYSTEM: 'system',
} as const

export const MAINTENANCE_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const

export const MAINTENANCE_TYPE = {
  PREVENTIVE: 'preventive',
  CORRECTIVE: 'corrective',
  PREDICTIVE: 'predictive',
  INSPECTION: 'inspection',
} as const

export const USER_ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  CLIENT: 'client',
  DRIVER: 'driver',
} as const

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const

export const MAP = {
  DEFAULT_CENTER: [-33.4489, -70.6693] as [number, number],
  DEFAULT_ZOOM: 8,
  TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '&copy; OpenStreetMap contributors',
  REFRESH_INTERVAL: 15000,
} as const
