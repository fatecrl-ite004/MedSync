import { CalendarDays, Clock3, MoreHorizontal, Stethoscope, UserRound } from 'lucide-react'
import {
  appointmentPatient,
  appointmentProfessional,
  formatDate,
  formatTime,
  specialtyName,
} from '../lib/format'
import type { Appointment } from '../types'
import { Avatar, StatusBadge } from './Display'

interface AppointmentCardProps {
  appointment: Appointment
  perspective?: 'patient' | 'professional'
  actions?: React.ReactNode
  compact?: boolean
}

export function AppointmentCard({
  appointment,
  perspective = 'patient',
  actions,
  compact = false,
}: AppointmentCardProps) {
  const personName = perspective === 'patient'
    ? appointmentProfessional(appointment)
    : appointmentPatient(appointment)
  const subtitle = perspective === 'patient'
    ? specialtyName(appointment.specialty, appointment.professional)
    : specialtyName(appointment.specialty)

  return (
    <article className={`appointment-card${compact ? ' appointment-card--compact' : ''}`}>
      <div className="appointment-card__date">
        <strong>{formatDate(appointment.starts_at, 'dd')}</strong>
        <span>{formatDate(appointment.starts_at, 'MMM')}</span>
      </div>
      <div className="appointment-card__person">
        <Avatar
          name={personName}
          src={perspective === 'patient' ? appointment.professional?.avatar_url : undefined}
          size="medium"
        />
        <div>
          <small>{perspective === 'patient' ? 'Consulta com' : 'Paciente'}</small>
          <strong>{personName}</strong>
          <span>{perspective === 'patient' ? <Stethoscope size={14} /> : <UserRound size={14} />} {subtitle}</span>
        </div>
      </div>
      <div className="appointment-card__when">
        <span><CalendarDays size={15} /> {formatDate(appointment.starts_at, 'EEEE, dd/MM')}</span>
        <span><Clock3 size={15} /> {formatTime(appointment.starts_at)}{appointment.ends_at ? ` – ${formatTime(appointment.ends_at)}` : ''}</span>
      </div>
      <div className="appointment-card__status"><StatusBadge status={appointment.status} /></div>
      {actions && <div className="appointment-card__actions">{actions}</div>}
      {!actions && compact && <MoreHorizontal size={18} className="appointment-card__muted-icon" />}
    </article>
  )
}
