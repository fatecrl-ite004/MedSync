import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarX2,
  LoaderCircle,
  RefreshCw,
  X,
} from 'lucide-react'

export function LoadingState({ label = 'Carregando informações...' }: { label?: string }) {
  return (
    <div className="state-panel state-panel--loading" role="status">
      <LoaderCircle className="spin" size={26} aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="skeleton-page" aria-label="Carregando conteúdo" aria-busy="true">
      <div className="skeleton skeleton--heading" />
      <div className="skeleton-grid">
        {Array.from({ length: cards }, (_, index) => (
          <div className="skeleton skeleton--card" key={index} />
        ))}
      </div>
      <div className="skeleton skeleton--panel" />
    </div>
  )
}

export function ErrorState({
  message = 'Algo não saiu como esperado.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <span className="state-panel__icon"><AlertTriangle size={25} /></span>
      <div>
        <strong>Não foi possível carregar</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="button button--secondary button--small" type="button" onClick={onRetry}>
          <RefreshCw size={16} /> Tentar novamente
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon || <CalendarX2 size={28} />}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  children?: ReactNode
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  tone = 'primary',
  busy = false,
  children,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button modal__close" type="button" onClick={onClose} aria-label="Fechar">
          <X size={19} />
        </button>
        <div className={`modal__symbol modal__symbol--${tone}`}>
          {tone === 'danger' ? <AlertTriangle size={24} /> : <RefreshCw size={24} />}
        </div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
        {children}
        <div className="modal__actions">
          <button className="button button--ghost" type="button" onClick={onClose} disabled={busy}>
            Voltar
          </button>
          <button
            className={`button ${tone === 'danger' ? 'button--danger' : 'button--primary'}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <LoaderCircle className="spin" size={17} />}
            {busy ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
