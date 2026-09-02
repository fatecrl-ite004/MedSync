import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, CircleAlert, Info, X, XCircle } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  title: string
  message?: string
  tone: ToastTone
}

interface ToastContextValue {
  showToast: (title: string, tone?: ToastTone, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: CircleAlert,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id))
  }, [])

  const showToast = useCallback((title: string, tone: ToastTone = 'success', message?: string) => {
    const id = Date.now() + Math.random()
    setToasts((items) => [...items, { id, title, tone, message }])
    window.setTimeout(() => removeToast(id), 4600)
  }, [removeToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.tone]
          return (
            <div className={`toast toast--${toast.tone}`} key={toast.id} role="status">
              <Icon size={20} aria-hidden="true" />
              <div className="toast__copy">
                <strong>{toast.title}</strong>
                {toast.message && <span>{toast.message}</span>}
              </div>
              <button
                className="icon-button icon-button--compact"
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Fechar aviso"
              >
                <X size={17} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider')
  return context
}
