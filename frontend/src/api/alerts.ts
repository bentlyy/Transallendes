import api from './axios'

export interface Alert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  status: string
  acknowledgedAt?: string
  resolvedAt?: string
  acknowledgedBy?: string
  resolvedBy?: string
  truckId?: string
  truckPlate?: string
  driverId?: string
  driverName?: string
  tripId?: string
  lat?: number
  lng?: number
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface AlertStats {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  acknowledged: number
  resolved: number
  pending: number
}

export async function getAlerts(params?: Record<string, string>): Promise<{ data: Alert[]; total: number }> {
  const res = await api.get('/alerts', { params })
  return res.data
}

export async function getAlert(id: string): Promise<Alert> {
  const res = await api.get(`/alerts/${id}`)
  return res.data
}

export async function acknowledgeAlert(id: string): Promise<Alert> {
  const res = await api.patch(`/alerts/${id}/acknowledge`)
  return res.data
}

export async function resolveAlert(id: string): Promise<Alert> {
  const res = await api.patch(`/alerts/${id}/resolve`)
  return res.data
}

export async function getAlertStats(params?: Record<string, string>): Promise<AlertStats> {
  const res = await api.get('/alerts/stats', { params })
  return res.data
}
