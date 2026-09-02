import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, format, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppointmentCard } from '../components/AppointmentCard'
import { PageHeading } from '../components/Display'
import { ConfirmDialog, EmptyState, ErrorState, PageSkeleton } from '../components/Feedback'
import { useToast } from '../context/ToastContext'
import { appointmentsApi, professionalsApi } from '../lib/api'
import { formatDateTime, formatTime, isCancelled, isPastAppointment } from '../lib/format'
import type { Appointment, Slot } from '../types'

type AppointmentTab = 'upcoming' | 'history' | 'cancelled'

export function AppointmentsPage() {
  const { showToast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [tab, setTab] = useState<AppointmentTab>('upcoming')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState(startOfDay(new Date()))
  const [rescheduleSlots, setRescheduleSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAppointments(await appointmentsApi.list())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar suas consultas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAppointments()
  }, [loadAppointments])

  const categorized = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    return {
      upcoming: sorted.filter((appointment) => !isCancelled(appointment.status) && !isPastAppointment(appointment)),
      history: sorted.filter((appointment) => !isCancelled(appointment.status) && isPastAppointment(appointment)).reverse(),
      cancelled: sorted.filter((appointment) => isCancelled(appointment.status)).reverse(),
    }
  }, [appointments])

  const displayed = categorized[tab]
  const rescheduleDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfDay(new Date()), index)), [])

  const handleCancel = async () => {
    if (!cancelTarget) return
    setBusy(true)
    try {
      await appointmentsApi.cancel(cancelTarget.id)
      showToast('Consulta cancelada', 'success', 'O horário foi liberado na agenda.')
      setCancelTarget(null)
      await loadAppointments()
    } catch (requestError) {
      showToast('Não foi possível cancelar', 'error', requestError instanceof Error ? requestError.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const loadRescheduleSlots = useCallback(async (appointment: Appointment, date: Date) => {
    const professionalId = appointment.professional?.id ?? appointment.professional_id
    if (professionalId === undefined) {
      showToast('Profissional indisponível', 'error', 'Não foi possível identificar o profissional desta consulta.')
      return
    }
    setLoadingSlots(true)
    setSelectedSlot(null)
    try {
      const dateValue = format(date, 'yyyy-MM-dd')
      const response = await professionalsApi.slots(professionalId, dateValue, dateValue)
      setRescheduleSlots(response.slots || [])
    } catch (requestError) {
      setRescheduleSlots([])
      showToast('Agenda indisponível', 'error', requestError instanceof Error ? requestError.message : undefined)
    } finally {
      setLoadingSlots(false)
    }
  }, [showToast])

  const openReschedule = (appointment: Appointment) => {
    setRescheduleTarget(appointment)
    const initialDate = startOfDay(new Date())
    setRescheduleDate(initialDate)
    void loadRescheduleSlots(appointment, initialDate)
  }

  const changeRescheduleDate = (date: Date) => {
    if (!rescheduleTarget) return
    setRescheduleDate(date)
    void loadRescheduleSlots(rescheduleTarget, date)
  }

  const handleReschedule = async () => {
    if (!rescheduleTarget || !selectedSlot) return
    setBusy(true)
    try {
      await appointmentsApi.reschedule(rescheduleTarget.id, selectedSlot.starts_at)
      showToast('Consulta remarcada', 'success', `Novo horário: ${formatDateTime(selectedSlot.starts_at)}.`)
      setRescheduleTarget(null)
      await loadAppointments()
    } catch (requestError) {
      showToast('Não foi possível remarcar', 'error', requestError instanceof Error ? requestError.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageSkeleton cards={3} />
  if (error) return <ErrorState message={error} onRetry={() => void loadAppointments()} />

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Sua agenda"
        title="Minhas consultas"
        description="Acompanhe seus horários e faça alterações quando precisar."
        action={<Link className="button button--primary" to="/agendar"><CalendarCheck2 size={18} /> Nova consulta</Link>}
      />

      <section className="appointment-overview">
        <div><span className="appointment-overview__icon"><CalendarClock size={23} /></span><span><small>Próximas</small><strong>{categorized.upcoming.length}</strong></span></div>
        <div><span className="appointment-overview__icon appointment-overview__icon--mint"><CheckCircle2 size={23} /></span><span><small>No histórico</small><strong>{categorized.history.length}</strong></span></div>
        <div><span className="appointment-overview__icon appointment-overview__icon--rose"><CalendarX2 size={23} /></span><span><small>Canceladas</small><strong>{categorized.cancelled.length}</strong></span></div>
      </section>

      <section className="panel appointments-panel">
        <div className="tabs" role="tablist" aria-label="Filtrar consultas">
          <button className={tab === 'upcoming' ? 'is-active' : ''} type="button" role="tab" onClick={() => setTab('upcoming')}>Próximas <span>{categorized.upcoming.length}</span></button>
          <button className={tab === 'history' ? 'is-active' : ''} type="button" role="tab" onClick={() => setTab('history')}>Histórico <span>{categorized.history.length}</span></button>
          <button className={tab === 'cancelled' ? 'is-active' : ''} type="button" role="tab" onClick={() => setTab('cancelled')}>Canceladas <span>{categorized.cancelled.length}</span></button>
        </div>
        {displayed.length ? (
          <div className="appointment-list">
            {displayed.map((appointment) => (
              <AppointmentCard
                appointment={appointment}
                key={appointment.id}
                actions={tab === 'upcoming' ? (
                  <>
                    <button className="button button--secondary button--small" type="button" onClick={() => openReschedule(appointment)}><RefreshCw size={15} /> Remarcar</button>
                    <button className="button button--ghost button--small button--danger-text" type="button" onClick={() => setCancelTarget(appointment)}><X size={16} /> Cancelar</button>
                  </>
                ) : undefined}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={tab === 'upcoming' ? 'Nenhuma consulta agendada' : tab === 'history' ? 'Seu histórico está vazio' : 'Nenhuma consulta cancelada'}
            description={tab === 'upcoming' ? 'Encontre uma especialidade e reserve o melhor horário para você.' : 'As consultas desta categoria aparecerão aqui.'}
            action={tab === 'upcoming' ? <Link className="button button--primary button--small" to="/agendar">Agendar consulta</Link> : undefined}
          />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar esta consulta?"
        description="O horário será liberado para outros pacientes. Esta ação não pode ser desfeita."
        confirmLabel="Sim, cancelar"
        tone="danger"
        busy={busy}
        onConfirm={() => void handleCancel()}
        onClose={() => !busy && setCancelTarget(null)}
      />

      {rescheduleTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !busy && setRescheduleTarget(null)}>
          <section className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="reschedule-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button modal__close" type="button" onClick={() => setRescheduleTarget(null)} aria-label="Fechar"><X size={19} /></button>
            <span className="modal__symbol modal__symbol--primary"><CalendarClock size={24} /></span>
            <h2 id="reschedule-title">Escolha o novo horário</h2>
            <p>Consulte a disponibilidade e selecione uma nova opção para a consulta.</p>
            <div className="reschedule-dates">
              {rescheduleDates.map((date) => (
                <button className={isSameDay(date, rescheduleDate) ? 'is-selected' : ''} type="button" onClick={() => changeRescheduleDate(date)} key={date.toISOString()}><small>{format(date, 'EEE', { locale: ptBR })}</small><strong>{format(date, 'dd')}</strong></button>
              ))}
            </div>
            {loadingSlots ? <div className="modal-loading"><LoaderCircle className="spin" size={22} /> Buscando horários...</div> : rescheduleSlots.length ? (
              <div className="reschedule-slots">
                {rescheduleSlots.map((slot) => (
                  <button className={`${selectedSlot?.starts_at === slot.starts_at ? 'is-selected' : ''}${slot.recommended ? ' is-recommended' : ''}`} type="button" onClick={() => setSelectedSlot(slot)} key={slot.starts_at}>{slot.recommended && <Sparkles size={13} />}<strong>{formatTime(slot.starts_at)}</strong></button>
                ))}
              </div>
            ) : <p className="modal-empty">Não há horários disponíveis nesta data.</p>}
            <div className="modal__actions"><button className="button button--ghost" type="button" onClick={() => setRescheduleTarget(null)} disabled={busy}>Voltar</button><button className="button button--primary" type="button" onClick={() => void handleReschedule()} disabled={!selectedSlot || busy}>{busy && <LoaderCircle className="spin" size={17} />}{busy ? 'Remarcando...' : 'Confirmar novo horário'}</button></div>
          </section>
        </div>
      )}
    </div>
  )
}
