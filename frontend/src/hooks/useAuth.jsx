import { useState, useCallback, createContext, useContext } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('auth')
    return stored ? JSON.parse(stored) : null
  })

  const signup = useCallback(async (email, password) => {
    const res = await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Signup failed')
    }
    const data = await res.json()
    const authData = { token: data.access_token, email: data.email, user_id: data.user_id }
    localStorage.setItem('auth', JSON.stringify(authData))
    setUser(authData)
    return authData
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    const authData = { token: data.access_token, email: data.email, user_id: data.user_id }
    localStorage.setItem('auth', JSON.stringify(authData))
    setUser(authData)
    return authData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function getToken() {
  const stored = localStorage.getItem('auth')
  return stored ? JSON.parse(stored).token : null
}
