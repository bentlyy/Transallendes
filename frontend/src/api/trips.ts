import api from './axios'

export interface Trip {
  id: string
  code: string
  origin: string
  destination: string
  originLat?: number
  originLng?: number
  destLat?: number
  destLng?: number
  status: string
  scheduledDate: string
  startedAt?: string
  completedAt?: string
  distance?: number
  estimatedDuration?: number
  actualDuration?: number
  cost?: number
  fuelCost?: number
  notes?: string
  truckId?: string
  truckPlate?: string
  driverId?: string
  driverName?: string
  clientId?: string
  clientName?: string
  createdAt: string
  updatedAt: string
}

export interface TripStats {
  total: number
  inProgress: number
  completed: number
  cancelled: number
  delayed: number
  planned: number
  avgDuration?: number
  avgDistance?: number
}

export interface TripPosition {
  lat: number
  lng: number
  speed: number
  heading: number
  recordedAt: string
}

export async function getTrips(params?: Record<string, string>): Promise<{ data: Trip[]; total: number }> {
  const res = await api.get('/trips', { params })
  return res.data
}

export async function getTrip(id: string): Promise<Trip> {
  const res = await api.get(`/trips/${id}`)
  return res.data
}

export async function createTrip(data: Partial<Trip>): Promise<Trip> {
  const res = await api.post('/trips', data)
  return res.data
}

export async function updateTrip(id: string, data: Partial<Trip>): Promise<Trip> {
  const res = await api.put(`/trips/${id}`, data)
  return res.data
}

export async function deleteTrip(id: string): Promise<void> {
  await api.delete(`/trips/${id}`)
}

export async function updateTripStatus(id: string, status: string): Promise<Trip> {
  const res = await api.patch(`/trips/${id}/status`, { status })
  return res.data
}

export async function getTripPositions(tripId: string): Promise<TripPosition[]> {
  const res = await api.get(`/trips/${tripId}/positions`)
  return res.data
}

export async function getTripStats(params?: Record<string, string>): Promise<TripStats> {
  const res = await api.get('/trips/stats', { params })
  return res.data
}
