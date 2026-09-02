import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CalendarCheck2, HeartPulse, ShieldCheck, Stethoscope, UserRound, UsersRound } from 'lucide-react'
import { Avatar, MetricCard, PageHeading, StatusBadge } from '../components/Display'
import { EmptyState, ErrorState, PageSkeleton } from '../components/Feedback'
import { appointmentsApi, professionalsApi, specialtiesApi } from '../lib/api'
import { formatDate, formatTime, professionalName, specialtyName } from '../lib/format'
import type { Appointment, Professional, Specialty } from '../types'

export function AdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAdmin = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [appointmentData, professionalData, specialtyData] = await Promise.all([
        appointmentsApi.list(), professionalsApi.list(), specialtiesApi.list(),
      ])
      setAppointments(appointmentData)
      setProfessionals(professionalData)
      setSpecialties(specialtyData)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os dados administrativos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAdmin() }, [loadAdmin])

  const uniquePatients = useMemo(() => new Set(appointments.map((item) => item.patient?.id).filter(Boolean)).size, [appointments])
  const activeAppointments = appointments.filter((item) => !['cancelled', 'canceled'].includes(item.status)).length
  const recentAppointments = [...appointments].sort((a, b) => new Date(b.created_at || b.starts_at).getTime() - new Date(a.created_at || a.starts_at).getTime()).slice(0, 6)

  if (loading) return <PageSkeleton cards={4} />
  if (error) return <ErrorState message={error} onRetry={() => void loadAdmin()} />

  return (
    <div className="page-stack">
      <PageHeading eyebrow="Central MedSync" title="Visão administrativa" description="Acompanhe os cadastros e a atividade operacional da plataforma." action={<span className="admin-safe-badge"><ShieldCheck size={17} /> Acesso administrativo</span>} />
      <section className="metrics-grid metrics-grid--four">
        <MetricCard label="Profissionais" value={professionals.length} hint="cadastrados" icon={<Stethoscope size={22} />} tone="blue" />
        <MetricCard label="Pacientes atendidos" value={uniquePatients} hint="com consultas registradas" icon={<UsersRound size={22} />} tone="mint" />
        <MetricCard label="Consultas ativas" value={activeAppointments} hint="na plataforma" icon={<CalendarCheck2 size={22} />} tone="violet" />
        <MetricCard label="Especialidades" value={specialties.length} hint="disponíveis" icon={<Activity size={22} />} tone="amber" />
      </section>

      <div className="admin-grid">
        <section className="panel admin-grid__wide">
          <div className="panel__header"><div><span className="eyebrow">Diretório</span><h2>Profissionais cadastrados</h2></div><span className="table-count">{professionals.length} registros</span></div>
          {professionals.length ? (
            <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Profissional</th><th>Especialidade</th><th>CRM</th><th>Status</th></tr></thead><tbody>{professionals.map((professional) => { const name = professionalName(professional); return <tr key={professional.id}><td><span className="table-person"><Avatar name={name} src={professional.avatar_url || professional.user?.avatar_url} size="small" /><span><strong>{name}</strong><small>{professional.email || professional.user?.email || 'E-mail não informado'}</small></span></span></td><td>{specialtyName(undefined, professional)}</td><td>{professional.crm || '—'}</td><td><span className="status-badge status-badge--success">Ativo</span></td></tr> })}</tbody></table></div>
          ) : <EmptyState title="Nenhum profissional" description="Os profissionais cadastrados aparecerão nesta tabela." />}
        </section>
        <aside className="panel">
          <div className="panel__header"><div><span className="eyebrow">Catálogo</span><h2>Especialidades</h2></div></div>
          {specialties.length ? <div className="admin-specialty-list">{specialties.map((specialty, index) => {
            const count = professionals.filter((professional) => String(professional.specialty_id) === String(specialty.id) || (typeof professional.specialty === 'object' && String(professional.specialty?.id) === String(specialty.id))).length
            return <div key={specialty.id}><span className={`specialty-icon specialty-icon--${index % 4}`}><HeartPulse size={17} /></span><span><strong>{specialty.name}</strong><small>{count} {count === 1 ? 'profissional' : 'profissionais'}</small></span></div>
          })}</div> : <EmptyState title="Nenhuma especialidade" description="O catálogo ainda está vazio." />}
        </aside>
      </div>

      <section className="panel">
        <div className="panel__header"><div><span className="eyebrow">Atividade</span><h2>Consultas recentes</h2></div><span className="table-count">{appointments.length} no total</span></div>
        {recentAppointments.length ? (
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Paciente</th><th>Profissional</th><th>Data</th><th>Status</th></tr></thead><tbody>{recentAppointments.map((appointment) => <tr key={appointment.id}><td><span className="table-person"><span className="table-person__icon"><UserRound size={17} /></span><span><strong>{appointment.patient?.full_name || appointment.patient?.name || 'Paciente'}</strong><small>{appointment.patient?.email || 'E-mail não informado'}</small></span></span></td><td>{professionalName(appointment.professional)}</td><td>{formatDate(appointment.starts_at, 'dd/MM/yyyy')} às {formatTime(appointment.starts_at)}</td><td><StatusBadge status={appointment.status} /></td></tr>)}</tbody></table></div>
        ) : <EmptyState title="Nenhuma atividade registrada" description="As consultas criadas na plataforma aparecerão aqui." />}
      </section>
    </div>
  )
}
