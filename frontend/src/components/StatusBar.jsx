import React, { useEffect, useState } from 'react'
import { checkHealth } from '../api/client'

export function StatusBar() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    checkHealth()
      .then(ok => setStatus(ok ? 'online' : 'offline'))
      .catch(() => setStatus('offline'))

    const interval = setInterval(() => {
      checkHealth()
        .then(ok => setStatus(ok ? 'online' : 'offline'))
        .catch(() => setStatus('offline'))
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const color = status === 'online' ? 'var(--green)' : status === 'offline' ? 'var(--red)' : 'var(--text-muted)'
  const label = status === 'online' ? 'Backend connected' : status === 'offline' ? 'Backend offline' : 'Connecting…'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        boxShadow: status === 'online' ? `0 0 6px ${color}` : 'none',
        animation: status === 'online' ? 'pulse-dot 2.5s ease-in-out infinite' : 'none',
      }} />
      {label}
    </div>
  )
}
