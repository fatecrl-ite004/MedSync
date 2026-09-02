import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Search,
  Sparkles,
  Stethoscope,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppointmentCard } from '../components/AppointmentCard'
import { Avatar, MetricCard, PageHeading } from '../components/Display'
import { EmptyState, ErrorState, PageSkeleton } from '../components/Feedback'
import { useAuth } from '../context/AuthContext'
import { appointmentsApi, professionalsApi, specialtiesApi } from '../lib/api'
import {
  firstName,
  isCancelled,
  isPastAppointment,
  professionalName,
  specialtyName,
  userName,
} from '../lib/format'
import type { Appointment, Professional, Specialty } from '../types'

export function PatientDashboard() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [appointmentData, professionalData, specialtyData] = await Promise.all([
        appointmentsApi.list(),
        professionalsApi.list(),
        specialtiesApi.list(),
      ])
      setAppointments(appointmentData)
      setProfessionals(professionalData)
      setSpecialties(specialtyData)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar o painel.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const upcoming = useMemo(() => appointments
    .filter((appointment) => !isCancelled(appointment.status) && !isPastAppointment(appointment))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()), [appointments])
  const completed = appointments.filter((appointment) => appointment.status === 'completed').length

  if (loading) return <PageSkeleton cards={3} />
  if (error) return <ErrorState message={error} onRetry={() => void loadDashboard()} />

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Seu espaço de cuidado"
        title={`Olá, ${firstName(userName(user))}`}
        description="Acompanhe seus próximos passos e encontre um horário que combine com a sua rotina."
        action={<Link className="button button--primary" to="/agendar"><CalendarCheck2 size={18} /> Agendar consulta</Link>}
      />

      <section className="patient-hero">
        <div className="patient-hero__copy">
          <span className="feature-pill"><Sparkles size={15} /> Agendamento inteligente</span>
          <h2>Seu próximo cuidado começa com um bom horário.</h2>
          <p>Escolha a especialidade e o MedSync organiza as melhores opções para você.</p>
          <Link className="button button--light" to="/agendar">Encontrar um horário <ArrowRight size={18} /></Link>
        </div>
        <div className="patient-hero__visual" aria-hidden="true">
          <span className="pulse-orbit pulse-orbit--one" />
          <span className="pulse-orbit pulse-orbit--two" />
          <span className="patient-hero__heart"><HeartPulse size={56} /></span>
          <span className="floating-chip floating-chip--top"><CheckCircle2 size={16} /> Sem conflitos</span>
          <span className="floating-chip floating-chip--bottom"><Clock3 size={16} /> No seu tempo</span>
        </div>
      </section>

      <section className="metrics-grid metrics-grid--three" aria-label="Resumo da conta">
        <MetricCard label="Próximas consultas" value={upcoming.length} hint={upcoming.length ? 'na sua agenda' : 'nenhuma marcada'} icon={<CalendarDays size={22} />} tone="blue" />
        <MetricCard label="Especialidades" value={specialties.length} hint="disponíveis na plataforma" icon={<Stethoscope size={22} />} tone="mint" />
        <MetricCard label="Consultas concluídas" value={completed} hint="no seu histórico" icon={<CheckCircle2 size={22} />} tone="violet" />
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-grid__main">
          <div className="panel__header"><div><span className="eyebrow">Agenda</span><h2>Próxima consulta</h2></div><Link className="text-link" to="/consultas">Ver todas <ArrowRight size={16} /></Link></div>
          {upcoming[0] ? (
            <AppointmentCard appointment={upcoming[0]} />
          ) : (
            <EmptyState
              title="Sua agenda está livre"
              description="Quando você marcar uma consulta, ela aparecerá aqui."
              action={<Link className="button button--secondary button--small" to="/agendar">Agendar agora</Link>}
            />
          )}
        </section>

        <aside className="panel">
          <div className="panel__header"><div><span className="eyebrow">Acesso rápido</span><h2>Especialidades</h2></div></div>
          {specialties.length ? (
            <div className="specialty-quick-list">
              {specialties.slice(0, 5).map((specialty, index) => (
                <Link to={`/agendar?especialidade=${specialty.id}`} key={specialty.id}>
                  <span className={`specialty-icon specialty-icon--${index % 4}`}><Stethoscope size={18} /></span>
                  <strong>{specialty.name}</strong>
                  <ArrowRight size={16} />
                </Link>
              ))}
              <Link className="specialty-quick-list__all" to="/agendar"><Search size={16} /> Ver todas as opções</Link>
            </div>
          ) : <EmptyState title="Nenhuma especialidade" description="As especialidades cadastradas aparecerão aqui." />}
        </aside>
      </div>

      <section className="panel">
        <div className="panel__header"><div><span className="eyebrow">Equipe de cuidado</span><h2>Profissionais disponíveis</h2></div><Link className="text-link" to="/agendar">Ver agenda <ArrowRight size={16} /></Link></div>
        {professionals.length ? (
          <div className="professional-strip">
            {professionals.slice(0, 4).map((professional) => {
              const name = professionalName(professional)
              return (
                <article className="professional-mini-card" key={professional.id}>
                  <Avatar name={name} src={professional.avatar_url || professional.user?.avatar_url} size="large" />
                  <div><strong>{name}</strong><span>{specialtyName(undefined, professional)}</span>{professional.crm && <small>{professional.crm}</small>}</div>
                  <Link to={`/agendar?profissional=${professional.id}`} aria-label={`Ver horários de ${name}`}><ArrowRight size={17} /></Link>
                </article>
              )
            })}
          </div>
        ) : <EmptyState icon={<UsersRound size={28} />} title="Nenhum profissional disponível" description="Os profissionais cadastrados na API aparecerão aqui." />}
      </section>
    </div>
  )
}
