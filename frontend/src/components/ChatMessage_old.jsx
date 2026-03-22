import React from 'react'

export function ChatMessage({ role, content, isNew }) {
  const isUser = role === 'user'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: isNew ? 'fadeUp 0.22s ease-out' : 'none',
      marginBottom: 4,
    }}>
      <div style={{
        maxWidth: '78%',
        padding: isUser ? '10px 14px' : '12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser
          ? 'linear-gradient(135deg, #6b5af0, #7c6af7)'
          : 'var(--bg3)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: 'var(--text)',
        fontSize: 14,
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {!isUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent-bright)',
              boxShadow: '0 0 6px var(--accent)',
            }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.06em' }}>
              AGENT
            </span>
          </div>
        )}
        {content}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 4 }}>
      <div style={{
        padding: '12px 16px',
        borderRadius: '16px 16px 16px 4px',
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            opacity: 0.6,
          }} />
        ))}
      </div>
    </div>
  )
}
