import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import { normalizeRole } from '../lib/format'
import type { UserRole } from '../types'

const demos: Array<{ role: UserRole; label: string; email: string; icon: typeof UserRound }> = [
  { role: 'patient', label: 'Paciente', email: 'paciente@medsync.test', icon: UserRound },
  { role: 'professional', label: 'Médico', email: 'medico@medsync.test', icon: Stethoscope },
  { role: 'admin', label: 'Admin', email: 'admin@medsync.test', icon: ShieldCheck },
]

function homeFor(role: UserRole) {
  if (role === 'professional') return '/profissional'
  if (role === 'admin') return '/admin'
  return '/paciente'
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={homeFor(normalizeRole(user.role))} replace />

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('demo123')
    setError('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const loggedUser = await login(email.trim(), password)
      const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(requestedPath || homeFor(normalizeRole(loggedUser.role)), { replace: true })
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-showcase">
        <div className="auth-showcase__glow auth-showcase__glow--one" />
        <div className="auth-showcase__glow auth-showcase__glow--two" />
        <Link className="auth-brand" to="/login">
          <span><HeartPulse size={25} /></span>
          <strong>MedSync</strong>
        </Link>
        <div className="auth-showcase__content">
          <span className="auth-kicker"><Sparkles size={15} /> Sua saúde no ritmo certo</span>
          <h1>Consultas mais simples.<br />Cuidado mais próximo.</h1>
          <p>Encontre o melhor horário, acompanhe sua agenda e cuide do que realmente importa.</p>
          <div className="showcase-benefits">
            <span><CheckCircle2 size={18} /> Agendamento em poucos passos</span>
            <span><CheckCircle2 size={18} /> Sugestões que combinam com sua rotina</span>
            <span><CheckCircle2 size={18} /> Agenda centralizada e segura</span>
          </div>
        </div>
        <div className="showcase-appointment-card">
          <span className="showcase-appointment-card__icon"><CalendarCheck2 size={23} /></span>
          <div><small>Próxima consulta</small><strong>Hoje, às 14:30</strong><span>Seu cuidado, sempre à vista.</span></div>
          <span className="showcase-appointment-card__status">Confirmada</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><HeartPulse size={24} /><strong>MedSync</strong></div>
          <header className="auth-header">
            <span className="eyebrow">Bem-vindo de volta</span>
            <h2>Acesse sua conta</h2>
            <p>Entre para visualizar e organizar seus atendimentos.</p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Senha</span>
              <span className="input-with-action">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <div className="form-meta">
              <label className="checkbox"><input type="checkbox" /> <span>Lembrar meu e-mail</span></label>
              <button className="text-button" type="button" disabled title="Disponível em breve">Esqueci minha senha</button>
            </div>
            <button className="button button--primary button--large button--full" type="submit" disabled={submitting || !email || !password}>
              {submitting ? <LoaderCircle className="spin" size={19} /> : <>Entrar <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="demo-access">
            <div className="demo-access__title"><span /> <small>ou acesse uma conta de demonstração</small><span /></div>
            <div className="demo-access__grid">
              {demos.map(({ icon: Icon, ...demo }) => (
                <button type="button" key={demo.email} onClick={() => fillDemo(demo.email)}>
                  <Icon size={18} />
                  <span><strong>{demo.label}</strong><small>Preencher acesso</small></span>
                </button>
              ))}
            </div>
            <p>Senha das contas demo: <code>demo123</code></p>
          </div>

          <p className="auth-switch">Ainda não tem uma conta? <Link to="/cadastro">Criar conta</Link></p>
        </div>
      </section>
    </main>
  )
}
