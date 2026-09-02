import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types'

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="app-loading" role="status">
        <div className="brand-mark brand-mark--large">M</div>
        <span className="app-loading__pulse" />
        <p>Preparando seu MedSync...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  if (roles && role && !roles.includes(role)) return <Navigate to="/" replace />

  return children
}
