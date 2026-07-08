import api from './axios'

export interface LoginRequest {
  email: string
  password: string
  totpCode?: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  companyName?: string
  phone?: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
    tenantId?: string
  }
  accessToken: string
  refreshToken: string
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await api.post('/auth/login', data)
  return res.data
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await api.post('/auth/register', data)
  return res.data
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const res = await api.post('/auth/refresh', { refreshToken })
  return res.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
  await api.put('/auth/change-password', data)
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email })
}

export async function resetPassword(data: { token: string; password: string; email?: string }): Promise<void> {
  await api.post('/auth/reset-password', data)
}

export async function enable2FA(): Promise<{ qrCode: string; secret: string }> {
  const res = await api.post('/auth/2fa/enable')
  return res.data
}

export async function verify2FA(code: string): Promise<void> {
  await api.post('/auth/2fa/verify', { code })
}

export async function disable2FA(code: string): Promise<void> {
  await api.post('/auth/2fa/disable', { code })
}
