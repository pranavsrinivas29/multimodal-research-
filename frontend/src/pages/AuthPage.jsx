import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

export function AuthPage() {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await signup(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
    }}>
      <div style={{
        width: 360, padding: '32px',
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
            Research Agent
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg2)',
          borderRadius: 10, padding: 3, marginBottom: 20,
        }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: '7px', borderRadius: 8, fontSize: 13,
              fontFamily: 'inherit', fontWeight: 500,
              background: mode === m ? 'var(--bg3)' : 'none',
              color: mode === m ? 'var(--text)' : 'var(--text-muted)',
              border: mode === m ? '1px solid var(--border)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}>
              {m === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@example.com"
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--text)', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="Min 6 characters"
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--text)', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: 'var(--red)',
              background: 'rgba(242,107,107,0.08)',
              border: '1px solid rgba(242,107,107,0.2)',
              borderRadius: 8, padding: '7px 10px',
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: 4, padding: '10px',
            background: loading ? 'var(--bg2)' : 'var(--accent)',
            color: loading ? 'var(--text-muted)' : '#fff',
            borderRadius: 10, fontSize: 14, fontWeight: 500,
            fontFamily: 'inherit', border: 'none',
            transition: 'all 0.15s ease', cursor: loading ? 'wait' : 'pointer',
          }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
