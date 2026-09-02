import { format, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  Appointment,
  AvailabilityRule,
  Professional,
  Specialty,
  User,
  UserRole,
} from '../types'

export const WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

export const SCHEDULE_WEEKDAYS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
]

export function normalizeRole(role?: string): UserRole {
  const value = (role || '').toLowerCase()
  if (['admin', 'administrator', 'administrador'].includes(value)) return 'admin'
  if (['professional', 'profissional', 'doctor', 'medico', 'médico'].includes(value)) {
    return 'professional'
  }
  return 'patient'
}

export function userName(user?: User | null) {
  return user?.name || user?.full_name || user?.email?.split('@')[0] || 'Usuário'
}

export function professionalName(professional?: Professional | null) {
  if (!professional) return 'Profissional'
  return (
    professional.name ||
    professional.full_name ||
    professional.user?.name ||
    professional.user?.full_name ||
    'Profissional'
  )
}

export function specialtyName(
  specialty?: Specialty | string | null,
  professional?: Professional | null,
) {
  if (typeof specialty === 'string') return specialty
  if (specialty?.name) return specialty.name
  if (typeof professional?.specialty === 'string') return professional.specialty
  if (professional?.specialty?.name) return professional.specialty.name
  if (professional?.specialties?.length) return professional.specialties[0].name
  return 'Clínica geral'
}

export function appointmentProfessional(appointment: Appointment) {
  return professionalName(appointment.professional)
}

export function appointmentPatient(appointment: Appointment) {
  return appointment.patient?.name || appointment.patient?.full_name || 'Paciente'
}

export function parseDate(value?: string | null) {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? date : null
}

export function formatDate(value?: string | null, pattern = "d 'de' MMMM") {
  const date = parseDate(value)
  return date ? format(date, pattern, { locale: ptBR }) : 'Data indisponível'
}

export function formatTime(value?: string | null) {
  const date = parseDate(value)
  return date ? format(date, 'HH:mm') : '--:--'
}

export function formatDateTime(value?: string | null) {
  const date = parseDate(value)
  return date
    ? format(date, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : 'Horário indisponível'
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'MS'
}

export function availabilityWeekday(rule: AvailabilityRule) {
  return rule.weekday ?? rule.day_of_week ?? 0
}

export function roleLabel(role?: string) {
  const normalized = normalizeRole(role)
  if (normalized === 'admin') return 'Administrador'
  if (normalized === 'professional') return 'Profissional'
  return 'Paciente'
}

export function statusMeta(status?: string) {
  const normalized = (status || '').toLowerCase()
  const map: Record<string, { label: string; tone: string }> = {
    pending: { label: 'Aguardando confirmação', tone: 'warning' },
    requested: { label: 'Aguardando confirmação', tone: 'warning' },
    confirmed: { label: 'Confirmada', tone: 'success' },
    scheduled: { label: 'Agendada', tone: 'success' },
    completed: { label: 'Concluída', tone: 'neutral' },
    cancelled: { label: 'Cancelada', tone: 'danger' },
    canceled: { label: 'Cancelada', tone: 'danger' },
    no_show: { label: 'Não compareceu', tone: 'danger' },
  }
  return map[normalized] || { label: status || 'Pendente', tone: 'warning' }
}

export function isCancelled(status?: string) {
  return ['cancelled', 'canceled'].includes((status || '').toLowerCase())
}

export function isPastAppointment(appointment: Appointment) {
  const date = parseDate(appointment.starts_at)
  return Boolean(date && date.getTime() < Date.now())
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}
