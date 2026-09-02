import { useMemo, useState } from 'react'
import {
  CalendarCheck2,
  CalendarClock,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { firstName, roleLabel, userName } from '../lib/format'
import type { UserRole } from '../types'
import { Avatar } from './Display'

interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

const navigations: Record<UserRole, NavigationItem[]> = {
  patient: [
    { label: 'Início', to: '/paciente', icon: LayoutDashboard, end: true },
    { label: 'Agendar', to: '/agendar', icon: CalendarCheck2 },
    { label: 'Consultas', to: '/consultas', icon: CalendarClock },
  ],
  professional: [
    { label: 'Minha agenda', to: '/profissional', icon: Stethoscope, end: true },
    { label: 'Disponibilidade', to: '/profissional/disponibilidade', icon: CalendarCheck2 },
  ],
  admin: [
    { label: 'Visão geral', to: '/admin', icon: LayoutDashboard, end: true },
  ],
}

const pageTitles: Record<string, string> = {
  '/paciente': 'Visão geral',
  '/agendar': 'Novo agendamento',
  '/consultas': 'Minhas consultas',
  '/profissional': 'Agenda profissional',
  '/profissional/disponibilidade': 'Disponibilidade',
  '/admin': 'Administração',
}

function Brand() {
  return (
    <NavLink className="brand" to="/" aria-label="MedSync — página inicial">
      <span className="brand-mark"><HeartPulse size={22} strokeWidth={2.2} /></span>
      <span className="brand-copy">
        <strong>MedSync</strong>
        <small>Cuidado conectado</small>
      </span>
    </NavLink>
  )
}

function NavItems({ items, onNavigate }: { items: NavigationItem[]; onNavigate?: () => void }) {
  return (
    <nav className="shell-nav" aria-label="Navegação principal">
      <span className="shell-nav__label">Menu</span>
      {items.map(({ icon: Icon, ...item }) => (
        <NavLink
          className={({ isActive }) => `shell-nav__item${isActive ? ' is-active' : ''}`}
          to={item.to}
          end={item.end}
          key={item.to}
          onClick={onNavigate}
        >
          <Icon size={19} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { user, role, logout } = useAuth()
  const location = useLocation()
  const [mobileMenu, setMobileMenu] = useState(false)
  const items = navigations[role || 'patient']
  const name = userName(user)
  const title = useMemo(() => pageTitles[location.pathname] || 'MedSync', [location.pathname])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <NavItems items={items} />
        <div className="sidebar__support">
          <span><ShieldCheck size={17} /> Ambiente seguro</span>
          <p>Seus dados de agenda ficam disponíveis apenas para usuários autorizados.</p>
        </div>
        <button className="sidebar-user" type="button" onClick={logout} title="Sair do MedSync">
          <Avatar name={name} src={user?.avatar_url} size="small" />
          <span>
            <strong>{name}</strong>
            <small>{roleLabel(user?.role)}</small>
          </span>
          <LogOut size={17} />
        </button>
      </aside>

      {mobileMenu && (
        <div className="mobile-drawer-backdrop" role="presentation" onMouseDown={() => setMobileMenu(false)}>
          <aside className="mobile-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mobile-drawer__head">
              <Brand />
              <button className="icon-button" type="button" onClick={() => setMobileMenu(false)} aria-label="Fechar menu">
                <X size={20} />
              </button>
            </div>
            <NavItems items={items} onNavigate={() => setMobileMenu(false)} />
            <button className="button button--ghost mobile-drawer__logout" type="button" onClick={logout}>
              <LogOut size={18} /> Sair da conta
            </button>
          </aside>
        </div>
      )}

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar__leading">
            <button className="icon-button topbar__menu" type="button" onClick={() => setMobileMenu(true)} aria-label="Abrir menu">
              <Menu size={21} />
            </button>
            <div>
              <span className="topbar__eyebrow">Área {roleLabel(user?.role).toLowerCase()}</span>
              <strong>{title}</strong>
            </div>
          </div>
          <div className="topbar__user">
            <span className="topbar__welcome">Olá, <strong>{firstName(name)}</strong></span>
            <Avatar name={name} src={user?.avatar_url} size="small" />
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
        {items.slice(0, 4).map(({ icon: Icon, ...item }) => (
          <NavLink
            to={item.to}
            end={item.end}
            key={item.to}
            className={({ isActive }) => isActive ? 'is-active' : ''}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function FeaturePill({ role }: { role: 'patient' | 'professional' | 'admin' }) {
  const data = {
    patient: { icon: Sparkles, text: 'Horários recomendados para sua rotina' },
    professional: { icon: Stethoscope, text: 'Sua agenda organizada em um só lugar' },
    admin: { icon: UsersRound, text: 'Visão centralizada da operação' },
  }[role]
  const Icon = data.icon
  return <span className="feature-pill"><Icon size={15} /> {data.text}</span>
}
