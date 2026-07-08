import api from './axios'

export interface Maintenance {
  id: string
  truckId: string
  truckPlate: string
  type: string
  status: string
  description: string
  scheduledDate: string
  completedDate?: string
  mileage: number
  cost?: number
  notes?: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

export async function getMaintenance(params?: Record<string, string>): Promise<{ data: Maintenance[]; total: number }> {
  const res = await api.get('/maintenance', { params })
  return res.data
}

export async function getMaintenanceItem(id: string): Promise<Maintenance> {
  const res = await api.get(`/maintenance/${id}`)
  return res.data
}

export async function createMaintenance(data: Partial<Maintenance>): Promise<Maintenance> {
  const res = await api.post('/maintenance', data)
  return res.data
}

export async function updateMaintenance(id: string, data: Partial<Maintenance>): Promise<Maintenance> {
  const res = await api.put(`/maintenance/${id}`, data)
  return res.data
}

export async function deleteMaintenance(id: string): Promise<void> {
  await api.delete(`/maintenance/${id}`)
}

export async function getUpcomingMaintenance(params?: Record<string, string>): Promise<Maintenance[]> {
  const res = await api.get('/maintenance/upcoming', { params })
  return res.data
}
