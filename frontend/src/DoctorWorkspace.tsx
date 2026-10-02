import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';

export type Patient = { id: number; name: string; birthDate: string; email: string; phone: string; allergies: string };
export type ClinicalRecord = { id: number; appointmentId: number; patientId: number; summary: string; plan: string; updatedAt: string; author: string };
export type Visit = { id: number; patientId: number; patientName: string; service: string; startsAt: string; durationMinutes?: number; status: string; conversationId: number | null; cancellationReason?: string };
export const statusLabel: Record<string, string> = { CONFIRMED: 'Confirmada', IN_PROGRESS: 'Em atendimento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' };
type Request = <T = any>(path: string, options?: RequestInit) => Promise<T>;
const date = (v: string) => new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
function localDate(value: string) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, [tabindex="0"]') || []);
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key === 'Tab') {
        const items = focusable(), first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop"><section ref={ref} className="modal-card doctor-modal" role="dialog" aria-modal="true" aria-label={title}><div className="section-title"><h2>{title}</h2><button className="btn" onClick={onClose} aria-label="Fechar formulário">✕</button></div>{children}</section></div>;
}

export function DoctorWorkspace({ mode, appointments, patients, records, profile, request, refresh, onChat, onCall, onRate, selectedPatient, onPatient }: {
  mode: 'appointments' | 'patients'; appointments: Visit[]; patients: Patient[]; records: ClinicalRecord[]; profile: any; request: Request; refresh: () => Promise<void>;
  onChat: (visit: Visit) => void; onCall: (visit: Visit) => void; onRate: (visit: Visit) => void; selectedPatient: number | null; onPatient: (id: number | null) => void;
}) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('ALL'), [day, setDay] = useState('');
  const [editor, setEditor] = useState<'visit' | 'patient' | 'record' | 'cancel' | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const dirty = useRef(false), busyRef = useRef(false);
  const close = () => { if (!busyRef.current && (!dirty.current || window.confirm('Descartar as alterações não salvas?'))) { setEditor(null); dirty.current = false; setError(''); } };
  const open = (kind: typeof editor, v: Visit | null = null) => { setEditor(kind); setVisit(v); setError(''); dirty.current = false; };
  async function perform(path: string, body: unknown, method = 'POST') {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await request(path, { method, body: JSON.stringify(body) });
      dirty.current = false; setEditor(null);
      await refresh(); setNotice('Alterações salvas.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const patient = patients.find(p => p.id === selectedPatient);
  const match = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
  const visits = appointments.filter(a => (!patient || a.patientId === patient.id) && match(a.patientName + ' ' + a.service) && (filter === 'ALL' || a.status === filter) && (!day || localDate(a.startsAt).slice(0,10) === day)).sort((a,b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  function renderVisit(a: Visit) {
    return <article className="visit-card card" key={a.id}><div className="visit-info"><span className={'status status-' + a.status.toLowerCase()}>{statusLabel[a.status]}</span><h3>{a.patientName}</h3><p>{a.service}</p><strong>{date(a.startsAt)}</strong><small>{a.durationMinutes || 50} minutos</small>{a.cancellationReason && <small>Motivo: {a.cancellationReason}</small>}</div><div className="actions">
      <button className="btn" onClick={() => onPatient(a.patientId)}>Histórico</button>
      <button className="btn" onClick={() => onChat(a)}>Chat</button>
      {['CONFIRMED', 'IN_PROGRESS'].includes(a.status) && <button className="btn" onClick={() => onCall(a)}>Teleconsulta</button>}
      {a.status === 'CONFIRMED' && <><button className="btn" onClick={() => open('visit', a)}>Reagendar</button><button className="btn danger" onClick={() => open('cancel', a)}>Cancelar consulta</button><button className="btn primary" disabled={busy} onClick={() => perform(`/appointments/${a.id}`, { status: 'IN_PROGRESS' }, 'PATCH')}>Iniciar atendimento</button></>}
      {a.status === 'IN_PROGRESS' && <><button className="btn primary" onClick={() => open('record', a)}>Registrar atendimento</button><button className="btn" disabled={busy || !records.some(r => r.appointmentId === a.id)} onClick={() => { if (window.confirm('Concluir atendimento? O registro ficará disponível apenas para leitura.')) perform(`/appointments/${a.id}`, { status: 'COMPLETED' }, 'PATCH'); }}>Concluir</button></>}
      {a.status === 'COMPLETED' && <><button className="btn" onClick={() => open('record', a)}>Ver registro</button><button className="btn" onClick={() => onRate(a)}>Avaliar</button></>}
    </div></article>;
  }
  function submitVisit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget));
    perform(visit ? `/appointments/${visit.id}` : '/appointments', { ...data, patientId: Number(data.patientId), durationMinutes: Number(data.durationMinutes), startsAt: new Date(String(data.startsAt)).toISOString() }, visit ? 'PATCH' : 'POST');
  }
  const currentRecord = records.find(r => r.appointmentId === visit?.id);
  return <>
    <div className="page-heading doctor-heading"><div><span className="eyebrow">Área médica</span><h1>{patient ? patient.name : mode === 'patients' ? 'Pacientes' : 'Agenda de consultas'}</h1><p>{patient ? 'Dados cadastrais e histórico de atendimentos.' : mode === 'patients' ? 'Acompanhe cada paciente em um só lugar.' : 'Organize sua agenda e acompanhe o atendimento do início ao fim.'}</p></div><div className="actions"><button className="btn" onClick={() => open('patient')}>Cadastrar paciente</button><button className="btn primary" onClick={() => open('visit')}>+ Nova consulta</button></div></div>
    {notice && <p role="status" className="inline-success">{notice}</p>}{error && !editor && <p role="alert" className="inline-error">{error}</p>}
    {patient && <section className="card patient-summary"><div><small>Nascimento</small><strong>{patient.birthDate ? new Date(patient.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</strong></div><div><small>Contato</small><strong>{patient.email || patient.phone || 'Não informado'}</strong><span>{patient.phone}</span></div><div><small>Alergias informadas</small><strong>{patient.allergies}</strong></div></section>}
    <div className="card filter-bar"><label>Buscar<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome do paciente ou atendimento" /></label>{(mode === 'appointments' || patient) && <><label>Status<select value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">Todos os status</option>{Object.entries(statusLabel).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label><label>Data<input type="date" value={day} onChange={e => setDay(e.target.value)} /></label></>}<button className="btn" onClick={() => { setQuery(''); setFilter('ALL'); setDay(''); }}>Limpar filtros</button></div>
    {mode === 'patients' && !patient ? <div className="patient-grid">{patients.filter(p => match(p.name + ' ' + p.email)).map(p => <article className="card patient-tile" key={p.id}><span className="avatar">{p.name.charAt(0)}</span><h2>{p.name}</h2><p>{p.email || 'E-mail não informado'}</p><small>{appointments.filter(a => a.patientId === p.id).length} consultas registradas</small><button className="btn full" onClick={() => onPatient(p.id)}>Abrir histórico</button></article>)}{!patients.some(p => match(p.name + ' ' + p.email)) && <div className="card empty-state">Nenhum paciente encontrado.</div>}</div> : <div className="stack">{visits.map(renderVisit)}{!visits.length && <div className="card empty-state"><h2>Nenhuma consulta encontrada</h2><p>Ajuste os filtros ou agende um novo atendimento.</p></div>}</div>}
    {patient && <section className="card section-card record-history"><h2>Registros de atendimento</h2>{records.filter(r => r.patientId === patient.id).sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map(r => <article className="record-entry" key={r.id}><strong>{date(r.updatedAt)} · {r.author}</strong><small>{statusLabel[appointments.find(a => a.id === r.appointmentId)?.status || 'IN_PROGRESS']}</small><h3>Resumo</h3><p>{r.summary}</p>{r.plan && <><h3>Plano e orientações</h3><p>{r.plan}</p></>}</article>)}{!records.some(r => r.patientId === patient.id) && <p>Nenhum registro salvo para este paciente.</p>}</section>}
    {editor && <Modal title={editor === 'visit' ? visit ? 'Reagendar consulta' : 'Nova consulta' : editor === 'patient' ? 'Cadastrar paciente' : editor === 'cancel' ? 'Cancelar consulta' : 'Registro de atendimento'} onClose={close}>
      {error && <p role="alert" className="inline-error">{error}</p>}
      {editor === 'visit' && <form className="doctor-form" onChange={() => { dirty.current = true; }} onSubmit={submitVisit}>
        <label>Paciente<select name="patientId" defaultValue={visit?.patientId || patient?.id || ''} required disabled={!!visit}><option value="">Selecione um paciente</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Atendimento<select name="service" required defaultValue={visit?.service || profile.services[0]?.title}>{Array.from(new Set<string>([...profile.services.map((s: any) => s.title), ...(visit ? [visit.service] : [])])).map(s => <option key={s}>{s}</option>)}</select></label>
        <div className="form-grid"><label>Data e horário<input name="startsAt" type="datetime-local" required defaultValue={visit ? localDate(visit.startsAt) : ''} /></label><label>Duração (minutos)<input name="durationMinutes" type="number" min="10" max="240" required defaultValue={visit?.durationMinutes || 50} /></label></div>
        <p className="muted">Os horários seguem o fuso do seu computador. Sobreposições na agenda são bloqueadas.</p><button className="btn primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar consulta'}</button>
      </form>}
      {editor === 'patient' && <form className="doctor-form" onChange={() => { dirty.current = true; }} onSubmit={e => { e.preventDefault(); perform('/patients', Object.fromEntries(new FormData(e.currentTarget))); }}>
        <label>Nome completo<input name="name" required minLength={3} maxLength={120} /></label><div className="form-grid"><label>Nascimento<input name="birthDate" type="date" max={localDate(new Date().toISOString()).slice(0,10)} /></label><label>Telefone<input name="phone" type="tel" maxLength={30} /></label></div><label>E-mail<input name="email" type="email" maxLength={160} /></label><label>Alergias informadas<textarea name="allergies" maxLength={1000} placeholder="Não informado" /></label><button className="btn primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar paciente'}</button>
      </form>}
      {editor === 'cancel' && <form className="doctor-form" onChange={() => { dirty.current = true; }} onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); perform(`/appointments/${visit!.id}`, { status: 'CANCELLED', reason: data.get('reason') }, 'PATCH'); }}><p>{visit?.patientName} · {visit && date(visit.startsAt)}</p><label>Motivo do cancelamento<textarea name="reason" required maxLength={1000} /></label><button className="btn danger" disabled={busy}>Confirmar cancelamento</button></form>}
      {editor === 'record' && <form className="doctor-form" onChange={() => { dirty.current = true; }} onSubmit={e => { e.preventDefault(); perform(`/records/${visit!.id}`, Object.fromEntries(new FormData(e.currentTarget)), 'PUT'); }}><p>{visit?.patientName} · {visit && date(visit.startsAt)}</p>{!currentRecord && visit?.status === 'COMPLETED' && <p>Esta consulta de demonstração não possui registro.</p>}<label>Resumo do atendimento<textarea name="summary" rows={6} required maxLength={10000} defaultValue={currentRecord?.summary || ''} readOnly={visit?.status === 'COMPLETED'} /></label><label>Plano e orientações<textarea name="plan" rows={4} maxLength={10000} defaultValue={currentRecord?.plan || ''} readOnly={visit?.status === 'COMPLETED'} /></label>{visit?.status === 'IN_PROGRESS' ? <><p className="muted">Salve o registro antes de concluir a consulta na agenda.</p><button className="btn primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar registro'}</button></> : <p className="muted">Consulta concluída · leitura somente.</p>}</form>}
    </Modal>}
  </>;
}

export function ProfileEditor({ profile, request, onSaved, onClose }: { profile: any; request: Request; onSaved: (p: any) => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dirty = useRef(false), busyRef = useRef(false);
  const close = () => { if (!busyRef.current && (!dirty.current || window.confirm('Descartar alterações do perfil?'))) onClose(); };
  return <Modal title="Editar perfil profissional" onClose={close}><form className="doctor-form" onChange={() => { dirty.current = true; }} onSubmit={async e => {
    e.preventDefault(); if (busyRef.current) return; busyRef.current = true; setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try { const updated = await request('/doctor/profile', { method: 'PATCH', body: JSON.stringify({ ...data, specialties: String(data.specialties).split(',').map(s => s.trim()).filter(Boolean) }) }); onSaved(updated); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { busyRef.current = false; setBusy(false); }
  }}>{error && <p role="alert" className="inline-error">{error}</p>}{[['name','Nome profissional'], ['crm','CRM'], ['headline','Título profissional'], ['city','Cidade'], ['state','Estado']].map(([key,label]) => <label key={key}>{label}<input name={key} required maxLength={key === 'state' ? 2 : 160} defaultValue={profile[key]} /></label>)}<label>Especialidades (separadas por vírgula)<input name="specialties" required maxLength={500} defaultValue={profile.specialties.join(', ')} /></label><label>Sobre<textarea name="about" required rows={5} maxLength={3000} defaultValue={profile.about} /></label><button className="btn primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil'}</button></form></Modal>;
}
