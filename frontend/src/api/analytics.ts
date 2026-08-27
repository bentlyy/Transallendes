import api from './axios'

export async function getExecutiveDashboard(params?: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await api.get('/analytics/executive', { params })
  return res.data
}

export async function getOperationalDashboard(params?: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await api.get('/analytics/operational', { params })
  return res.data
}

export async function getClientDashboard(
  clientId: string | number,
  params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await api.get(`/analytics/client/${clientId}`, { params })
  return res.data
}

export async function getDriverRankings(params?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const res = await api.get('/analytics/rankings/drivers', { params })
  return res.data
}

export async function getClientRankings(params?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const res = await api.get('/analytics/rankings/clients', { params })
  return res.data
}
