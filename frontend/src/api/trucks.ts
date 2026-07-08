import api from './axios'

export interface Truck {
  id: string
  plate: string
  brand: string
  model: string
  year: number
  type: string
  status: string
  fuelLevel?: number
  mileage?: number
  lat?: number
  lng?: number
  speed?: number
  ignition?: boolean
  driverId?: string
  driverName?: string
  clientId?: string
  clientName?: string
  lastPositionUpdate?: string
  createdAt: string
  updatedAt: string
}

export interface TruckPosition {
  id: string
  truckId: string
  lat: number
  lng: number
  speed: number
  heading: number
  ignition: boolean
  recordedAt: string
}

export interface TruckStats {
  total: number
  moving: number
  stopped: number
  idle: number
  engineOff: number
  alert: number
  disconnected: number
  avgSpeed?: number
  totalDistance?: number
  totalFuel?: number
}

export async function getTrucks(params?: Record<string, string>): Promise<{ data: Truck[]; total: number }> {
  const res = await api.get('/trucks', { params })
  return res.data
}

export async function getTruck(id: string): Promise<Truck> {
  const res = await api.get(`/trucks/${id}`)
  return res.data
}

export async function createTruck(data: Partial<Truck>): Promise<Truck> {
  const res = await api.post('/trucks', data)
  return res.data
}

export async function updateTruck(id: string, data: Partial<Truck>): Promise<Truck> {
  const res = await api.put(`/trucks/${id}`, data)
  return res.data
}

export async function deleteTruck(id: string): Promise<void> {
  await api.delete(`/trucks/${id}`)
}

export async function getTruckPositions(truckId: string, params?: { from?: string; to?: string }): Promise<TruckPosition[]> {
  const res = await api.get(`/trucks/${truckId}/positions`, { params })
  return res.data
}

export async function getTruckLastPosition(truckId: string): Promise<TruckPosition> {
  const res = await api.get(`/trucks/${truckId}/positions/last`)
  return res.data
}

export async function getTruckStats(params?: Record<string, string>): Promise<TruckStats> {
  const res = await api.get('/trucks/stats', { params })
  return res.data
}
