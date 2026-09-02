import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, format, isSameDay, isWithinInterval, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Hourglass,
  Settings2,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppointmentCard } from '../components/AppointmentCard'
import { MetricCard, PageHeading } from '../components/Display'
import { EmptyState, ErrorState, PageSkeleton } from '../components/Feedback'
import { useAuth } from '../context/AuthContext'
import { appointmentsApi } from '../lib/api'
import { firstName, isCancelled, parseDate, userName } from '../lib/format'
import type { Appointment } from '../types'

export function ProfessionalDashboard() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfDay(new Date()), index)), [])

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAppointments(await appointmentsApi.list())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a agenda.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAppointments() }, [loadAppointments])

  const activeAppointments = useMemo(() => appointments.filter((item) => !isCancelled(item.status)), [appointments])
  const appointmentsForDate = activeAppointments
    .filter((appointment) => {
      const date = parseDate(appointment.starts_at)
      return date ? isSameDay(date, selectedDate) : false
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const weekAppointments = activeAppointments.filter((appointment) => {
    const date = parseDate(appointment.starts_at)
    return date ? isWithinInterval(date, { start: weekDates[0], end: addDays(weekDates[6], 1) }) : false
  })
  const scheduled = weekAppointments.filter((item) => ['confirmed', 'scheduled'].includes(item.status)).length
  const pending = weekAppointments.filter((item) => ['pending', 'requested'].includes(item.status)).length
  const uniquePatients = new Set(weekAppointments.map((item) => item.patient?.id).filter(Boolean)).size

  if (loading) return <PageSkeleton cards={4} />
  if (error) return <ErrorState message={error} onRetry={() => void loadAppointments()} />

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Painel profissional"
        title={`Bom trabalho, ${firstName(userName(user))}`}
        description="Tenha uma visão clara do seu dia e mantenha a disponibilidade atualizada."
        action={<Link className="button button--secondary" to="/profissional/disponibilidade"><Settings2 size={18} /> Ajustar disponibilidade</Link>}
      />

      <section className="metrics-grid metrics-grid--four">
        <MetricCard label="Atendimentos hoje" value={activeAppointments.filter((item) => { const date = parseDate(item.starts_at); return date ? isSameDay(date, new Date()) : false }).length} hint="na agenda do dia" icon={<CalendarCheck2 size={22} />} tone="blue" />
        <MetricCard label="Esta semana" value={weekAppointments.length} hint="consultas programadas" icon={<Clock3 size={22} />} tone="mint" />
        <MetricCard label="Agendadas" value={scheduled} hint="nesta semana" icon={<CheckCircle2 size={22} />} tone="violet" />
        <MetricCard label="Aguardando" value={pending} hint="confirmação" icon={<Hourglass size={22} />} tone="amber" />
      </section>

      <section className="panel professional-agenda">
        <div className="panel__header"><div><span className="eyebrow">Agenda da semana</span><h2>{format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</h2></div><span className="agenda-patient-count"><UsersRound size={17} /> {uniquePatients} pacientes na semana</span></div>
        <div className="professional-date-strip">
          {weekDates.map((date) => {
            const count = activeAppointments.filter((appointment) => { const parsed = parseDate(appointment.starts_at); return parsed ? isSameDay(parsed, date) : false }).length
            return (
              <button className={isSameDay(date, selectedDate) ? 'is-selected' : ''} type="button" onClick={() => setSelectedDate(date)} key={date.toISOString()}>
                <small>{format(date, 'EEE', { locale: ptBR }).replace('.', '')}</small><strong>{format(date, 'dd')}</strong><span>{count ? `${count} consulta${count > 1 ? 's' : ''}` : 'Livre'}</span>
              </button>
            )
          })}
        </div>
        {appointmentsForDate.length ? (
          <div className="professional-timeline">
            {appointmentsForDate.map((appointment) => (
              <div className="professional-timeline__row" key={appointment.id}>
                <time>{format(parseDate(appointment.starts_at)!, 'HH:mm')}</time>
                <span className="professional-timeline__line" />
                <AppointmentCard appointment={appointment} perspective="professional" compact />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<UserRoundCheck size={28} />} title="Agenda livre neste dia" description="Nenhuma consulta foi agendada para a data selecionada." action={<Link className="button button--secondary button--small" to="/profissional/disponibilidade">Revisar disponibilidade</Link>} />
        )}
      </section>
    </div>
  )
}
