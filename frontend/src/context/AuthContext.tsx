import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi, session } from '../lib/api'
import { normalizeRole } from '../lib/format'
import type { RegistrationPayload, User, UserRole } from '../types'

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (payload: RegistrationPayload) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    session.clear()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!session.getToken()) {
      setLoading(false)
      return
    }

    try {
      setUser(await authApi.me())
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  useEffect(() => {
    const handleUnauthorized = () => logout()
    window.addEventListener('medsync:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('medsync:unauthorized', handleUnauthorized)
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    session.setToken(response.access_token)
    setUser(response.user)
    return response.user
  }, [])

  const register = useCallback(async (payload: RegistrationPayload) => {
    const response = await authApi.register(payload)
    if ('access_token' in response) {
      session.setToken(response.access_token)
      setUser(response.user)
      return response.user
    }

    return login(payload.email, payload.password)
  }, [login])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    role: user ? normalizeRole(user.role) : null,
    loading,
    login,
    register,
    logout,
    refreshUser,
  }), [loading, login, logout, refreshUser, register, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}
