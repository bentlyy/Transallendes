export const TRUCK_STATUS_COLORS: Record<string, string> = {
  moving: '#22c55e',
  stopped: '#3b82f6',
  idle: '#f59e0b',
  engine_off: '#ef4444',
  alert: '#ef4444',
  disconnected: '#6b7280',
}

export const TRUCK_STATUS_BG: Record<string, string> = {
  moving: '#dcfce7',
  stopped: '#dbeafe',
  idle: '#fef3c7',
  engine_off: '#fee2e2',
  alert: '#fee2e2',
  disconnected: '#f3f4f6',
}

export const TRIP_STATUS_COLORS: Record<string, string> = {
  planned: '#6b7280',
  assigned: '#3b82f6',
  loading: '#f59e0b',
  in_progress: '#22c55e',
  resting: '#8b5cf6',
  completed: '#10b981',
  cancelled: '#ef4444',
  delayed: '#f97316',
}

export const TRIP_STATUS_BG: Record<string, string> = {
  planned: '#f3f4f6',
  assigned: '#dbeafe',
  loading: '#fef3c7',
  in_progress: '#dcfce7',
  resting: '#ede9fe',
  completed: '#d1fae5',
  cancelled: '#fee2e2',
  delayed: '#ffedd5',
}

export const ALERT_SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#6b7280',
}

export const ALERT_SEVERITY_BG: Record<string, string> = {
  critical: '#fee2e2',
  high: '#ffedd5',
  medium: '#fef3c7',
  low: '#f3f4f6',
}

export const MAINTENANCE_STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#10b981',
  overdue: '#ef4444',
  cancelled: '#6b7280',
}

export function getTruckStatusColor(status: string): string {
  return TRUCK_STATUS_COLORS[status] || '#6b7280'
}

export function getTruckStatusBg(status: string): string {
  return TRUCK_STATUS_BG[status] || '#f3f4f6'
}

export function getTripStatusColor(status: string): string {
  return TRIP_STATUS_COLORS[status] || '#6b7280'
}

export function getTripStatusBg(status: string): string {
  return TRIP_STATUS_BG[status] || '#f3f4f6'
}

export function getAlertSeverityColor(severity: string): string {
  return ALERT_SEVERITY_COLORS[severity] || '#6b7280'
}

export function getAlertSeverityBg(severity: string): string {
  return ALERT_SEVERITY_BG[severity] || '#f3f4f6'
}

export function getMaintenanceStatusColor(status: string): string {
  return MAINTENANCE_STATUS_COLORS[status] || '#6b7280'
}
