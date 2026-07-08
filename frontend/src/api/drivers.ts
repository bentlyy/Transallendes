import api from './axios'

export interface Driver {
  id: string
  name: string
  email: string
  phone: string
  licenseNumber: string
  licenseType: string
  licenseExpiry: string
  status: string
  tenantId: string
  clientId?: string
  clientName?: string
  createdAt: string
  updatedAt: string
}

export interface DriverTrip {
  id: string
  driverId: string
  truckPlate: string
  origin: string
  destination: string
  status: string
  startedAt?: string
  completedAt?: string
  distance?: number
}

export async function getDrivers(params?: Record<string, string>): Promise<{ data: Driver[]; total: number }> {
  const res = await api.get('/drivers', { params })
  return res.data
}

export async function getDriver(id: string): Promise<Driver> {
  const res = await api.get(`/drivers/${id}`)
  return res.data
}

export async function createDriver(data: Partial<Driver>): Promise<Driver> {
  const res = await api.post('/drivers', data)
  return res.data
}

export async function updateDriver(id: string, data: Partial<Driver>): Promise<Driver> {
  const res = await api.put(`/drivers/${id}`, data)
  return res.data
}

export async function deleteDriver(id: string): Promise<void> {
  await api.delete(`/drivers/${id}`)
}

export async function getDriverTrips(driverId: string, params?: Record<string, string>): Promise<{ data: DriverTrip[]; total: number }> {
  const res = await api.get(`/drivers/${driverId}/trips`, { params })
  return res.data
}
