import api from './axios'

export interface Client {
  id: string
  name: string
  rut?: string
  contactName?: string
  email: string
  phone: string
  address?: string
  city?: string
  country?: string
  contactEmail?: string
  contactPhone?: string
  status: string
  config?: Record<string, unknown>
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface ClientStats {
  totalTrips: number
  tripsByStatus: { status: string; count: number }[]
  activeTrucks: number
  totalRevenue: number
}

export async function getClients(params?: Record<string, string>): Promise<{ data: Client[]; total: number }> {
  const res = await api.get('/clients', { params })
  return res.data
}

export async function getClient(id: string): Promise<Client> {
  const res = await api.get(`/clients/${id}`)
  return res.data
}

export async function createClient(data: Partial<Client>): Promise<Client> {
  const res = await api.post('/clients', data)
  return res.data
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
  const res = await api.put(`/clients/${id}`, data)
  return res.data
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`)
}

export async function getClientTrips(clientId: string, params?: Record<string, string>): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const res = await api.get(`/clients/${clientId}/trips`, { params })
  return res.data
}

export async function getClientTrucks(clientId: string): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const res = await api.get(`/clients/${clientId}/trucks`)
  return res.data
}

export async function getClientStats(clientId: string): Promise<ClientStats> {
  const res = await api.get(`/clients/${clientId}/stats`)
  return res.data
}
