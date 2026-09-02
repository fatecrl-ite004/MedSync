import type {
  Appointment,
  AuthResponse,
  AvailabilityPayload,
  AvailabilityRule,
  BookingPayload,
  Id,
  Professional,
  RegistrationPayload,
  SlotResponse,
  Specialty,
  User,
} from '../types'

const configuredUrl = import.meta.env.VITE_API_URL?.trim()
export const API_URL = (configuredUrl || 'http://localhost:8000/api').replace(/\/$/, '')

const TOKEN_KEY = 'medsync.access_token'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export const session = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  authenticated?: boolean
}

function errorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback

  const data = payload as Record<string, unknown>
  if (typeof data.message === 'string') return data.message
  if (typeof data.error === 'string') return data.error
  if (typeof data.detail === 'string') return data.detail

  if (Array.isArray(data.detail)) {
    const messages = data.detail
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const detail = item as Record<string, unknown>
        return typeof detail.msg === 'string' ? detail.msg : null
      })
      .filter(Boolean)
    if (messages.length) return messages.join('. ')
  }

  return fallback
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, authenticated = true, headers, ...init } = options
  const token = session.getToken()
  const requestHeaders = new Headers(headers)

  requestHeaders.set('Accept', 'application/json')
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json')
  if (authenticated && token) requestHeaders.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao MedSync. Verifique se a API está disponível.',
      0,
    )
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = response.status === 204
    ? undefined
    : contentType.includes('application/json')
      ? await response.json().catch(() => undefined)
      : await response.text().catch(() => undefined)

  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      window.dispatchEvent(new CustomEvent('medsync:unauthorized'))
    }
    throw new ApiError(
      errorMessage(payload, 'Não foi possível concluir a solicitação.'),
      response.status,
      payload,
    )
  }

  return payload as T
}

export function unwrapList<T>(payload: T[] | { items?: T[]; data?: T[]; results?: T[] }): T[] {
  if (Array.isArray(payload)) return payload
  return payload.items || payload.data || payload.results || []
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      authenticated: false,
    }),
  register: (payload: RegistrationPayload) =>
    request<AuthResponse | User>('/auth/register', {
      method: 'POST',
      body: { ...payload, full_name: payload.name },
      authenticated: false,
    }),
  me: () => request<User>('/auth/me'),
}

export const specialtiesApi = {
  list: async () => unwrapList(await request<Specialty[] | { items?: Specialty[] }>('/specialties')),
}

export const professionalsApi = {
  list: async (specialtyId?: Id) => {
    const query = specialtyId === undefined
      ? ''
      : `?specialty_id=${encodeURIComponent(String(specialtyId))}`
    return unwrapList(
      await request<Professional[] | { items?: Professional[] }>(`/professionals${query}`),
    )
  },
  slots: (professionalId: Id, dateFrom: string, dateTo: string) => {
    const start = new Date(`${dateFrom}T12:00:00`)
    const end = new Date(`${dateTo}T12:00:00`)
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
    const query = new URLSearchParams({ date: dateFrom, days: String(days) })
    const id = encodeURIComponent(String(professionalId))
    return request<SlotResponse>(`/professionals/${id}/slots?${query}`)
  },
}

export const appointmentsApi = {
  list: async () =>
    unwrapList(await request<Appointment[] | { items?: Appointment[] }>('/appointments')),
  create: (payload: BookingPayload) =>
    request<Appointment>('/appointments', { method: 'POST', body: payload }),
  reschedule: (appointmentId: Id, startsAt: string) =>
    request<Appointment>(
      `/appointments/${encodeURIComponent(String(appointmentId))}/reschedule`,
      { method: 'PATCH', body: { starts_at: startsAt } },
    ),
  cancel: (appointmentId: Id) =>
    request<Appointment>(
      `/appointments/${encodeURIComponent(String(appointmentId))}/cancel`,
      { method: 'PATCH' },
    ).catch((error) => {
      if (!(error instanceof ApiError) || error.status !== 405) throw error
      return request<Appointment>(
        `/appointments/${encodeURIComponent(String(appointmentId))}/cancel`,
        { method: 'POST' },
      )
    }),
}

export const availabilityApi = {
  list: async () =>
    unwrapList(
      await request<AvailabilityRule[] | { items?: AvailabilityRule[] }>('/availability'),
    ),
  create: (payload: AvailabilityPayload) =>
    request<AvailabilityRule>('/availability', { method: 'POST', body: payload }),
  remove: async (availabilityId: Id) => {
    const encodedId = encodeURIComponent(String(availabilityId))
    try {
      return await request<void>(`/availability/${encodedId}`, { method: 'DELETE' })
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error
      return request<void>(`/availability?id=${encodedId}`, { method: 'DELETE' })
    }
  },
}
