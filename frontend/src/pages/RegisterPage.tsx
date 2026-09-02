import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  HeartPulse,
  LoaderCircle,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError, specialtiesApi } from '../lib/api'
import { normalizeRole } from '../lib/format'
import type { Specialty, UserRole } from '../types'

function homeFor(role: UserRole) {
  if (role === 'professional') return '/profissional'
  if (role === 'admin') return '/admin'
  return '/paciente'
}

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'patient' | 'professional'>('patient')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [crm, setCrm] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [preferredPeriod, setPreferredPeriod] = useState('morning')
  const [accepted, setAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const passwordChecks = useMemo(() => [
    { label: '8 caracteres', ok: password.length >= 8 },
    { label: 'uma letra', ok: /[A-Za-z]/.test(password) },
    { label: 'um número', ok: /\d/.test(password) },
  ], [password])

  useEffect(() => {
    specialtiesApi.list().then(setSpecialties).catch(() => setSpecialties([]))
  }, [])

  if (user) return <Navigate to={homeFor(normalizeRole(user.role))} replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!accepted || passwordChecks.some((check) => !check.ok)) return
    setSubmitting(true)
    setError('')
    try {
      const created = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        crm: role === 'professional' ? crm.trim() : undefined,
        specialty_id: role === 'professional'
          ? specialties.find((item) => String(item.id) === specialtyId)?.id
          : undefined,
        preferred_period: role === 'patient' ? preferredPeriod : undefined,
      })
      navigate(homeFor(normalizeRole(created.role)), { replace: true })
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Não foi possível criar sua conta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="register-layout">
      <header className="register-topbar">
        <Link className="auth-brand auth-brand--dark" to="/login"><span><HeartPulse size={24} /></span><strong>MedSync</strong></Link>
        <span>Já tem uma conta? <Link to="/login">Entrar</Link></span>
      </header>
      <section className="register-card">
        <Link className="back-link" to="/login"><ArrowLeft size={17} /> Voltar para o acesso</Link>
        <header className="register-card__header">
          <span className="eyebrow">Comece agora</span>
          <h1>Crie sua conta</h1>
          <p>Leva menos de dois minutos. Escolha como você usará o MedSync.</p>
        </header>

        <form className="register-form" onSubmit={handleSubmit}>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <fieldset className="role-selector">
            <legend>Eu quero usar o MedSync como</legend>
            <button className={role === 'patient' ? 'is-selected' : ''} type="button" onClick={() => setRole('patient')}>
              <span><UserRound size={22} /></span><div><strong>Paciente</strong><small>Quero agendar consultas</small></div>{role === 'patient' && <Check size={18} />}
            </button>
            <button className={role === 'professional' ? 'is-selected' : ''} type="button" onClick={() => setRole('professional')}>
              <span><Stethoscope size={22} /></span><div><strong>Profissional</strong><small>Quero gerenciar minha agenda</small></div>{role === 'professional' && <Check size={18} />}
            </button>
          </fieldset>

          <div className="form-grid">
            <label className="field field--wide"><span>Nome completo</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Como podemos chamar você?" required /></label>
            <label className="field field--wide"><span>E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="voce@exemplo.com" required /></label>
            {role === 'professional' ? (
              <>
                <label className="field"><span>CRM</span><input value={crm} onChange={(event) => setCrm(event.target.value)} placeholder="Ex.: CRM/SP 123456" required /></label>
                <label className="field"><span>Especialidade</span><select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} required><option value="">Selecione</option>{specialties.map((specialty) => <option value={String(specialty.id)} key={specialty.id}>{specialty.name}</option>)}</select></label>
              </>
            ) : (
              <label className="field field--wide"><span>Período preferido</span><select value={preferredPeriod} onChange={(event) => setPreferredPeriod(event.target.value)}><option value="morning">Manhã</option><option value="afternoon">Tarde</option><option value="evening">Noite</option></select></label>
            )}
            <label className="field field--wide">
              <span>Senha</span>
              <span className="input-with-action"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Crie uma senha segura" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
              <span className="password-checks">{passwordChecks.map((check) => <small className={check.ok ? 'is-valid' : ''} key={check.label}><Check size={13} /> {check.label}</small>)}</span>
            </label>
          </div>

          <label className="checkbox checkbox--terms"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Li e concordo com os termos de uso e a política de privacidade do MedSync.</span></label>
          <button className="button button--primary button--large button--full" type="submit" disabled={submitting || !name || !email || !accepted || passwordChecks.some((check) => !check.ok) || (role === 'professional' && (!crm || !specialtyId))}>
            {submitting ? <><LoaderCircle className="spin" size={19} /> Criando conta...</> : <>Criar minha conta <ArrowRight size={18} /></>}
          </button>
          <p className="privacy-note"><ShieldCheck size={15} /> Seus dados são enviados somente à API configurada do MedSync.</p>
        </form>
      </section>
    </main>
  )
}
