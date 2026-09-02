import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarCheck2, CheckCircle2, Clock3, LoaderCircle, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { PageHeading } from '../components/Display'
import { ConfirmDialog, EmptyState, ErrorState, PageSkeleton } from '../components/Feedback'
import { useToast } from '../context/ToastContext'
import { availabilityApi } from '../lib/api'
import { availabilityWeekday, SCHEDULE_WEEKDAYS } from '../lib/format'
import type { AvailabilityRule } from '../types'

export function AvailabilityPage() {
  const { showToast } = useToast()
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [weekday, setWeekday] = useState(0)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AvailabilityRule | null>(null)

  const loadAvailability = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRules(await availabilityApi.list())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a disponibilidade.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAvailability() }, [loadAvailability])

  const groupedRules = useMemo(() => SCHEDULE_WEEKDAYS.map((day, index) => ({
    day,
    index,
    rules: rules.filter((rule) => availabilityWeekday(rule) === index).sort((a, b) => a.start_time.localeCompare(b.start_time)),
  })), [rules])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (startTime >= endTime) {
      showToast('Horário inválido', 'warning', 'O horário final deve ser posterior ao inicial.')
      return
    }
    setSubmitting(true)
    try {
      await availabilityApi.create({ weekday, start_time: startTime, end_time: endTime, slot_duration_minutes: 30 })
      showToast('Disponibilidade adicionada', 'success', `${SCHEDULE_WEEKDAYS[weekday]}, das ${startTime} às ${endTime}.`)
      await loadAvailability()
    } catch (requestError) {
      showToast('Não foi possível salvar', 'error', requestError instanceof Error ? requestError.message : undefined)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await availabilityApi.remove(deleteTarget.id)
      showToast('Período removido', 'success', 'A agenda foi atualizada.')
      setDeleteTarget(null)
      await loadAvailability()
    } catch (requestError) {
      showToast('Não foi possível remover', 'error', requestError instanceof Error ? requestError.message : undefined)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageSkeleton cards={2} />
  if (error) return <ErrorState message={error} onRetry={() => void loadAvailability()} />

  return (
    <div className="page-stack">
      <PageHeading eyebrow="Configuração de agenda" title="Disponibilidade" description="Defina quando seus pacientes poderão encontrar horários livres." />
      <div className="availability-layout">
        <section className="panel availability-list-panel">
          <div className="panel__header"><div><span className="eyebrow">Agenda semanal</span><h2>Períodos de atendimento</h2></div><span className="rule-count"><CalendarCheck2 size={17} /> {rules.length} período{rules.length === 1 ? '' : 's'}</span></div>
          {rules.length ? (
            <div className="weekday-list">
              {groupedRules.map((group) => (
                <div className={`weekday-row${group.rules.length ? '' : ' is-empty'}`} key={group.day}>
                  <div className="weekday-row__day"><span>{group.day.slice(0, 3)}</span><strong>{group.day}</strong></div>
                  <div className="weekday-row__periods">
                    {group.rules.length ? group.rules.map((rule) => (
                      <span className="time-rule" key={rule.id}><Clock3 size={15} /><strong>{rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}</strong>{(rule.slot_duration_minutes || rule.appointment_duration_minutes) && <small>{rule.slot_duration_minutes || rule.appointment_duration_minutes} min</small>}<button type="button" onClick={() => setDeleteTarget(rule)} aria-label={`Remover período de ${group.day}`}><Trash2 size={15} /></button></span>
                    )) : <span className="weekday-row__closed">Sem atendimento</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState title="Disponibilidade ainda não definida" description="Adicione seu primeiro período de atendimento no formulário ao lado." />}
        </section>

        <aside className="panel availability-form-panel">
          <div className="panel__header"><div><span className="eyebrow">Novo período</span><h2>Adicionar horário</h2></div><span className="panel-icon"><Plus size={20} /></span></div>
          <form className="availability-form" onSubmit={handleCreate}>
            <fieldset className="weekday-selector"><legend>Dia da semana</legend><div>{SCHEDULE_WEEKDAYS.map((day, index) => <button className={weekday === index ? 'is-selected' : ''} type="button" onClick={() => setWeekday(index)} key={day}>{day.slice(0, 3)}</button>)}</div></fieldset>
            <div className="form-grid form-grid--times"><label className="field"><span>Início</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required /></label><label className="field"><span>Fim</span><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required /></label></div>
            <label className="field"><span>Duração padrão da consulta</span><select value={30} disabled aria-label="Duração fixa"><option value={30}>30 minutos</option></select></label>
            <div className="availability-info"><ShieldCheck size={18} /><span>Conflitos com períodos existentes serão validados pela API antes de salvar.</span></div>
            <button className="button button--primary button--full" type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" size={17} /> Salvando...</> : <><Plus size={17} /> Adicionar período</>}</button>
          </form>
          <div className="availability-tip"><CheckCircle2 size={18} /><div><strong>Dica para uma agenda saudável</strong><p>Crie intervalos separados para reservar pausas entre os atendimentos.</p></div></div>
        </aside>
      </div>
      <ConfirmDialog open={Boolean(deleteTarget)} title="Remover este período?" description={deleteTarget ? `${SCHEDULE_WEEKDAYS[availabilityWeekday(deleteTarget)]}, das ${deleteTarget.start_time.slice(0, 5)} às ${deleteTarget.end_time.slice(0, 5)} deixará de aparecer como disponibilidade.` : ''} confirmLabel="Remover período" tone="danger" busy={submitting} onConfirm={() => void handleDelete()} onClose={() => !submitting && setDeleteTarget(null)} />
    </div>
  )
}
