import type { ReactNode } from 'react'
import { initials, statusMeta } from '../lib/format'

export function Avatar({ name, src, size = 'medium' }: { name: string; src?: string | null; size?: 'small' | 'medium' | 'large' }) {
  if (src) {
    return <img className={`avatar avatar--${size}`} src={src} alt="" />
  }
  return <span className={`avatar avatar--${size}`}>{initials(name)}</span>
}

export function StatusBadge({ status }: { status?: string }) {
  const meta = statusMeta(status)
  return <span className={`status-badge status-badge--${meta.tone}`}>{meta.label}</span>
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-heading__action">{action}</div>}
    </header>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'blue',
}: {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  tone?: 'blue' | 'mint' | 'amber' | 'violet'
}) {
  return (
    <article className="metric-card">
      <span className={`metric-card__icon metric-card__icon--${tone}`}>{icon}</span>
      <div>
        <span className="metric-card__label">{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  )
}
