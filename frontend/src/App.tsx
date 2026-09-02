import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { normalizeRole } from './lib/format'
import { AdminPage } from './pages/AdminPage'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { AvailabilityPage } from './pages/AvailabilityPage'
import { BookingPage } from './pages/BookingPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PatientDashboard } from './pages/PatientDashboard'
import { ProfessionalDashboard } from './pages/ProfessionalDashboard'
import { RegisterPage } from './pages/RegisterPage'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  const role = normalizeRole(user.role)
  if (role === 'professional') return <Navigate to="/profissional" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/paciente" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route
        element={(
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        )}
      >
        <Route path="paciente" element={<ProtectedRoute roles={['patient']}><PatientDashboard /></ProtectedRoute>} />
        <Route path="agendar" element={<ProtectedRoute roles={['patient']}><BookingPage /></ProtectedRoute>} />
        <Route path="consultas" element={<ProtectedRoute roles={['patient']}><AppointmentsPage /></ProtectedRoute>} />
        <Route path="profissional" element={<ProtectedRoute roles={['professional']}><ProfessionalDashboard /></ProtectedRoute>} />
        <Route path="profissional/disponibilidade" element={<ProtectedRoute roles={['professional']}><AvailabilityPage /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
