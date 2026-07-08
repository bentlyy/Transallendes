import api from './axios'

export interface Geofence {
  id: string
  name: string
  type: 'circle' | 'polygon'
  lat: number
  lng: number
  radius?: number
  polygon?: { lat: number; lng: number }[]
  color: string
  enabled: boolean
  tenantId: string
  createdAt: string
  updatedAt: string
}

export async function getGeofences(params?: Record<string, string>): Promise<{ data: Geofence[]; total: number }> {
  const res = await api.get('/geofences', { params })
  return res.data
}

export async function getGeofence(id: string): Promise<Geofence> {
  const res = await api.get(`/geofences/${id}`)
  return res.data
}

export async function createGeofence(data: Partial<Geofence>): Promise<Geofence> {
  const res = await api.post('/geofences', data)
  return res.data
}

export async function updateGeofence(id: string, data: Partial<Geofence>): Promise<Geofence> {
  const res = await api.put(`/geofences/${id}`, data)
  return res.data
}

export async function deleteGeofence(id: string): Promise<void> {
  await api.delete(`/geofences/${id}`)
}

export async function findNearbyGeofences(lat: number, lng: number): Promise<Geofence[]> {
  const res = await api.get('/geofences/nearby', { params: { lat, lng } })
  return res.data
}
