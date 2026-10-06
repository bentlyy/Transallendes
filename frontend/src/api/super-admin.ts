import api from './axios'

export interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  logo?: string
  status: string
  config?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface SuperAdminStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalTrucks: number
  totalTrips: number
  activeTrips: number
}

export async function getTenants(params?: Record<string, string>): Promise<{ data: Tenant[]; total: number }> {
  const res = await api.get('/super-admin/tenants', { params })
  return res.data
}

export async function getTenant(id: string): Promise<Tenant & { users: Record<string, unknown>[] }> {
  const res = await api.get(`/super-admin/tenants/${id}`)
  return res.data
}

export async function createTenant(data: Partial<Tenant>): Promise<Tenant> {
  const res = await api.post('/super-admin/tenants', data)
  return res.data
}

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  const res = await api.put(`/super-admin/tenants/${id}`, data)
  return res.data
}

export async function deleteTenant(id: string): Promise<void> {
  await api.delete(`/super-admin/tenants/${id}`)
}

export async function getUsers(params?: Record<string, string>): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const res = await api.get('/super-admin/users', { params })
  return res.data
}

export async function getStats(): Promise<SuperAdminStats> {
  const res = await api.get('/super-admin/stats')
  return res.data
}
