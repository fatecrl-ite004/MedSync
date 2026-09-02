import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Search,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { addDays, format, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar, PageHeading } from '../components/Display'
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback'
import { useToast } from '../context/ToastContext'
import { appointmentsApi, professionalsApi, specialtiesApi } from '../lib/api'
import { formatDateTime, formatTime, professionalName, specialtyName } from '../lib/format'
import type { Professional, Slot, Specialty } from '../types'

const stepLabels = ['Especialidade', 'Profissional', 'Horário', 'Confirmar']
const periodLabels: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
}

export function BookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const [step, setStep] = useState(1)
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProfessionals, setLoadingProfessionals] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [bookingComplete, setBookingComplete] = useState(false)

  const dates = useMemo(() => Array.from({ length: 10 }, (_, index) => addDays(startOfDay(new Date()), index)), [])
  const filteredSpecialties = specialties.filter((specialty) =>
    specialty.name.toLowerCase().includes(search.toLowerCase()),
  )

  const loadSpecialties = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await specialtiesApi.list()
      setSpecialties(data)
      const requestedId = searchParams.get('especialidade')
      if (requestedId) {
        const match = data.find((item) => String(item.id) === requestedId)
        if (match) {
          setSelectedSpecialty(match)
          setStep(2)
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as especialidades.')
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    void loadSpecialties()
  }, [loadSpecialties])

  useEffect(() => {
    if (!selectedSpecialty || step < 2) return
    let active = true
    setLoadingProfessionals(true)
    setError('')
    professionalsApi.list(selectedSpecialty.id)
      .then((data) => {
        if (!active) return
        setProfessionals(data)
        const requestedId = searchParams.get('profissional')
        const match = requestedId
          ? data.find((item) => String(item.id) === requestedId)
          : undefined
        if (match) {
          setSelectedProfessional(match)
          setStep(3)
        }
      })
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os profissionais.'))
      .finally(() => active && setLoadingProfessionals(false))
    return () => { active = false }
  }, [searchParams, selectedSpecialty, step])

  const loadSlots = useCallback(async () => {
    if (!selectedProfessional) return
    setLoadingSlots(true)
    setError('')
    setSelectedSlot(null)
    const date = format(selectedDate, 'yyyy-MM-dd')
    try {
      const data = await professionalsApi.slots(selectedProfessional.id, date, date)
      setSlots(data.slots || [])
    } catch (requestError) {
      setSlots([])
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os horários.')
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedDate, selectedProfessional])

  useEffect(() => {
    if (step === 3 && selectedProfessional) void loadSlots()
  }, [loadSlots, selectedProfessional, step])

  const chooseSpecialty = (specialty: Specialty) => {
    setSelectedSpecialty(specialty)
    setSelectedProfessional(null)
    setSelectedSlot(null)
    setStep(2)
  }

  const chooseProfessional = (professional: Professional) => {
    setSelectedProfessional(professional)
    setSelectedSlot(null)
    setStep(3)
  }

  const confirmBooking = async () => {
    if (!selectedProfessional || !selectedSlot) return
    setSubmitting(true)
    try {
      await appointmentsApi.create({
        professional_id: selectedProfessional.id,
        specialty_id: selectedSpecialty?.id,
        starts_at: selectedSlot.starts_at,
        ends_at: selectedSlot.ends_at,
      })
      setBookingComplete(true)
      showToast('Consulta agendada!', 'success', 'O novo horário já está na sua agenda.')
    } catch (requestError) {
      showToast('Não foi possível agendar', 'error', requestError instanceof Error ? requestError.message : undefined)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Buscando especialidades..." />
  if (error && !specialties.length) return <ErrorState message={error} onRetry={() => void loadSpecialties()} />

  if (bookingComplete) {
    return (
      <section className="booking-success">
        <span className="booking-success__icon"><CheckCircle2 size={42} /></span>
        <span className="eyebrow">Tudo certo</span>
        <h1>Consulta agendada!</h1>
        <p>Seu horário com <strong>{professionalName(selectedProfessional)}</strong> foi reservado para {formatDateTime(selectedSlot?.starts_at)}.</p>
        <div className="booking-success__summary">
          <span><Stethoscope size={18} /> {specialtyName(selectedSpecialty)}</span>
          <span><Clock3 size={18} /> {formatTime(selectedSlot?.starts_at)} – {formatTime(selectedSlot?.ends_at)}</span>
        </div>
        <div className="booking-success__actions">
          <button className="button button--primary" type="button" onClick={() => navigate('/consultas')}>Ver minhas consultas</button>
          <button className="button button--ghost" type="button" onClick={() => { setStep(1); setBookingComplete(false); setSelectedSpecialty(null); setSelectedProfessional(null); setSelectedSlot(null) }}>Novo agendamento</button>
        </div>
      </section>
    )
  }

  return (
    <div className="page-stack booking-page">
      <PageHeading title="Agendar consulta" description="Siga as etapas e encontre o horário ideal para você." />

      <ol className="booking-steps" aria-label="Etapas do agendamento">
        {stepLabels.map((label, index) => {
          const number = index + 1
          const done = number < step
          return (
            <li className={`${number === step ? 'is-current' : ''}${done ? ' is-done' : ''}`} key={label}>
              <span>{done ? <Check size={16} /> : number}</span><strong>{label}</strong>
              {index < stepLabels.length - 1 && <i />}
            </li>
          )
        })}
      </ol>

      <div className="booking-layout">
        <section className="panel booking-workspace">
          {step === 1 && (
            <>
              <div className="booking-section-head"><div><span className="eyebrow">Etapa 1 de 4</span><h2>Qual especialidade você procura?</h2><p>Escolha a área de cuidado para continuar.</p></div></div>
              <label className="search-field"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar especialidade" aria-label="Buscar especialidade" /></label>
              {filteredSpecialties.length ? (
                <div className="selection-grid">
                  {filteredSpecialties.map((specialty, index) => (
                    <button className="selection-card" type="button" onClick={() => chooseSpecialty(specialty)} key={specialty.id}>
                      <span className={`specialty-icon specialty-icon--${index % 4}`}><Stethoscope size={22} /></span>
                      <div><strong>{specialty.name}</strong><small>{specialty.description || 'Consulte profissionais e horários disponíveis.'}</small></div>
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </div>
              ) : <EmptyState title="Nenhuma especialidade encontrada" description="Tente buscar por outro termo." />}
            </>
          )}

          {step === 2 && (
            <>
              <button className="back-link" type="button" onClick={() => setStep(1)}><ArrowLeft size={17} /> Alterar especialidade</button>
              <div className="booking-section-head"><div><span className="eyebrow">Etapa 2 de 4</span><h2>Escolha o profissional</h2><p>Profissionais de {selectedSpecialty?.name} disponíveis na plataforma.</p></div></div>
              {loadingProfessionals ? <LoadingState label="Buscando profissionais..." /> : error ? <ErrorState message={error} onRetry={() => setStep(1)} /> : professionals.length ? (
                <div className="professional-selection-list">
                  {professionals.map((professional) => {
                    const name = professionalName(professional)
                    return (
                      <button type="button" onClick={() => chooseProfessional(professional)} key={professional.id}>
                        <Avatar name={name} src={professional.avatar_url || professional.user?.avatar_url} size="large" />
                        <div><span className="professional-selection-list__verified"><BadgeCheck size={14} /> Profissional cadastrado</span><strong>{name}</strong><small>{specialtyName(undefined, professional)}{professional.crm ? ` • ${professional.crm}` : ''}</small>{professional.bio && <p>{professional.bio}</p>}</div>
                        <span className="button button--secondary button--small">Ver horários <ArrowRight size={16} /></span>
                      </button>
                    )
                  })}
                </div>
              ) : <EmptyState icon={<UserRound size={28} />} title="Nenhum profissional encontrado" description="Ainda não há profissionais disponíveis para esta especialidade." action={<button className="button button--ghost button--small" type="button" onClick={() => setStep(1)}>Escolher outra especialidade</button>} />}
            </>
          )}

          {step === 3 && (
            <>
              <button className="back-link" type="button" onClick={() => setStep(2)}><ArrowLeft size={17} /> Alterar profissional</button>
              <div className="booking-section-head"><div><span className="eyebrow">Etapa 3 de 4</span><h2>Escolha a data e o horário</h2><p>Os horários mais compatíveis aparecem em destaque.</p></div></div>
              <div className="date-picker-strip">
                <button className="icon-button" type="button" aria-label="Datas anteriores" disabled><ChevronLeft size={19} /></button>
                <div className="date-picker-strip__dates">
                  {dates.map((date) => (
                    <button className={isSameDay(date, selectedDate) ? 'is-selected' : ''} type="button" onClick={() => setSelectedDate(date)} key={date.toISOString()}>
                      <small>{format(date, 'EEE', { locale: ptBR }).replace('.', '')}</small><strong>{format(date, 'dd')}</strong><span>{format(date, 'MMM', { locale: ptBR }).replace('.', '')}</span>
                    </button>
                  ))}
                </div>
                <button className="icon-button" type="button" aria-label="Próximas datas" disabled><ChevronRight size={19} /></button>
              </div>
              {loadingSlots ? <LoadingState label="Consultando a agenda..." /> : error ? <ErrorState message={error} onRetry={() => void loadSlots()} /> : slots.length ? (
                <div className="slot-area">
                  {slots.some((slot) => slot.recommended) && <div className="recommendation-note"><Sparkles size={17} /><div><strong>Recomendação MedSync</strong><span>Priorizamos opções compatíveis com sua preferência e a disponibilidade do profissional.</span></div></div>}
                  <div className="slot-grid">
                    {[...slots].sort((a, b) => Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)) || a.starts_at.localeCompare(b.starts_at)).map((slot) => (
                      <button className={`${selectedSlot?.starts_at === slot.starts_at ? 'is-selected' : ''}${slot.recommended ? ' is-recommended' : ''}`} type="button" onClick={() => setSelectedSlot(slot)} key={slot.starts_at}>
                        {slot.recommended && <span><Sparkles size={12} /> Recomendado</span>}
                        <strong>{formatTime(slot.starts_at)}</strong>
                        <small>{slot.period ? (periodLabels[slot.period] || slot.period) : 'Disponível'}</small>
                        {slot.reason && <em>{slot.reason}</em>}
                      </button>
                    ))}
                  </div>
                  <div className="booking-next-row"><button className="button button--primary" type="button" disabled={!selectedSlot} onClick={() => setStep(4)}>Revisar agendamento <ArrowRight size={17} /></button></div>
                </div>
              ) : <EmptyState title="Sem horários nesta data" description="Escolha outro dia para consultar novas opções." />}
            </>
          )}

          {step === 4 && (
            <>
              <button className="back-link" type="button" onClick={() => setStep(3)}><ArrowLeft size={17} /> Alterar horário</button>
              <div className="booking-section-head"><div><span className="eyebrow">Última etapa</span><h2>Revise seu agendamento</h2><p>Confira os dados antes de confirmar a reserva.</p></div></div>
              <div className="booking-review">
                <div className="booking-review__doctor"><Avatar name={professionalName(selectedProfessional)} src={selectedProfessional?.avatar_url || selectedProfessional?.user?.avatar_url} size="large" /><div><small>Consulta com</small><strong>{professionalName(selectedProfessional)}</strong><span>{specialtyName(selectedSpecialty, selectedProfessional)}</span></div><BadgeCheck size={23} /></div>
                <div className="booking-review__details"><span><CalendarCheck2 size={19} /><div><small>Data e hora</small><strong>{formatDateTime(selectedSlot?.starts_at)}</strong></div></span><span><Clock3 size={19} /><div><small>Duração</small><strong>{selectedSlot ? `${Math.round((new Date(selectedSlot.ends_at).getTime() - new Date(selectedSlot.starts_at).getTime()) / 60_000)} minutos` : 'A confirmar'}</strong></div></span></div>
                {selectedSlot?.reason && <div className="recommendation-note"><Sparkles size={17} /><div><strong>Por que este horário?</strong><span>{selectedSlot.reason}</span></div></div>}
                <button className="button button--primary button--large button--full" type="button" onClick={() => void confirmBooking()} disabled={submitting}>{submitting ? <><LoaderCircle className="spin" size={18} /> Confirmando...</> : <><CheckCircle2 size={18} /> Confirmar agendamento</>}</button>
                <p className="booking-review__notice">Ao confirmar, este horário será reservado e aparecerá em “Minhas consultas”.</p>
              </div>
            </>
          )}
        </section>

        <aside className="booking-summary panel">
          <span className="eyebrow">Seu agendamento</span>
          <h3>Resumo</h3>
          <div className={`summary-item${selectedSpecialty ? ' is-filled' : ''}`}><span><Stethoscope size={18} /></span><div><small>Especialidade</small><strong>{selectedSpecialty?.name || 'Não selecionada'}</strong></div></div>
          <div className={`summary-item${selectedProfessional ? ' is-filled' : ''}`}><span><UserRound size={18} /></span><div><small>Profissional</small><strong>{selectedProfessional ? professionalName(selectedProfessional) : 'Não selecionado'}</strong></div></div>
          <div className={`summary-item${selectedSlot ? ' is-filled' : ''}`}><span><CalendarCheck2 size={18} /></span><div><small>Data e horário</small><strong>{selectedSlot ? formatDateTime(selectedSlot.starts_at) : 'Não selecionado'}</strong></div></div>
          <div className="booking-summary__safe"><CheckCircle2 size={17} /><span>O MedSync valida o horário novamente antes de confirmar.</span></div>
          <Link className="text-link" to="/consultas">Ver minhas consultas <ArrowRight size={15} /></Link>
        </aside>
      </div>
    </div>
  )
}
