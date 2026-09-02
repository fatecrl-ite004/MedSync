export type Id = string | number

export type UserRole = 'patient' | 'professional' | 'admin'

export interface User {
  id: Id
  name?: string
  full_name?: string
  email: string
  role: UserRole | string
  avatar_url?: string | null
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Specialty {
  id: Id
  name: string
  description?: string | null
}

export interface Professional {
  id: Id
  user_id?: Id
  name?: string
  full_name?: string
  email?: string
  user?: Pick<User, 'id' | 'name' | 'full_name' | 'email' | 'avatar_url'>
  specialty_id?: Id
  specialty?: Specialty | string | null
  specialties?: Specialty[]
  crm?: string | null
  bio?: string | null
  avatar_url?: string | null
  city?: string | null
  rating?: number | null
}

export interface PatientSummary {
  id?: Id
  name?: string
  full_name?: string
  email?: string
}

export interface Slot {
  starts_at: string
  ends_at: string
  period?: string
  recommended?: boolean
  score?: number
  reason?: string | null
}

export interface SlotResponse {
  professional_id: Id
  slots: Slot[]
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | string

export interface Appointment {
  id: Id
  starts_at: string
  ends_at?: string
  status: AppointmentStatus
  professional_id?: Id
  specialty_id?: Id
  professional?: Professional | null
  patient?: PatientSummary | null
  specialty?: Specialty | string | null
  notes?: string | null
  cancellation_reason?: string | null
  created_at?: string
}

export interface AvailabilityRule {
  id: Id
  weekday?: number
  day_of_week?: number
  start_time: string
  end_time: string
  slot_duration_minutes?: number
  appointment_duration_minutes?: number
  active?: boolean
}

export interface RegistrationPayload {
  name: string
  email: string
  password: string
  role: Exclude<UserRole, 'admin'>
  crm?: string
  preferred_period?: string
  specialty_id?: Id
  bio?: string
}

export interface BookingPayload {
  professional_id: Id
  specialty_id?: Id
  starts_at: string
  ends_at?: string
}

export interface AvailabilityPayload {
  weekday: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
}
