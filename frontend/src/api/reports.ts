import api from './axios'

export interface Report {
  id: string
  name: string
  type: string
  format: string
  status: string
  params?: Record<string, unknown>
  url?: string
  generatedAt?: string
  createdAt: string
}

export async function getReports(params?: Record<string, string>): Promise<{ data: Report[]; total: number }> {
  const res = await api.get('/reports', { params })
  return res.data
}

export async function getReport(id: string): Promise<Report> {
  const res = await api.get(`/reports/${id}`)
  return res.data
}

export async function generateReport(data: { type: string; format: string; params: Record<string, unknown> }): Promise<Report> {
  const res = await api.post('/reports/generate', data)
  return res.data
}

export async function downloadReport(id: string): Promise<Blob> {
  const res = await api.get(`/reports/${id}/download`, { responseType: 'blob' })
  return res.data
}
