import React from 'react'

export function ChatMessage({ role, content, isNew, streaming, error }) {
  const isUser = role === 'user'

  // Render [1], [2] etc as styled citation badges
  const renderContent = (text) => {
    if (isUser) return text
    const parts = text.split(/(\[\d+\])/g)
    return parts.map((part, i) => {
      if (/^\[\d+\]$/.test(part)) {
        return (
          <span key={i} style={{
            display: 'inline-block',
            fontSize: 10,
            fontWeight: 600,
            padding: '1px 5px',
            borderRadius: 4,
            background: 'rgba(124,106,247,0.15)',
            color: 'var(--accent-bright)',
            margin: '0 1px',
            verticalAlign: 'middle',
            fontFamily: 'var(--font-mono)',
          }}>
            {part}
          </span>
        )
      }
      // Render ## headings
      if (part.includes('## ')) {
        return part.split('\n').map((line, j) => {
          if (line.startsWith('## ')) {
            return (
              <div key={j} style={{
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--text)',
                marginTop: 12,
                marginBottom: 4,
                borderTop: '1px solid var(--border)',
                paddingTop: 8,
              }}>
                {line.replace('## ', '')}
              </div>
            )
          }
          return <span key={j}>{line}{j < part.split('\n').length - 1 ? '\n' : ''}</span>
        })
      }
      return <span key={i}>{part}</span>
    })
  }

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
          : error ? 'rgba(242,107,107,0.08)' : 'var(--bg3)',
        border: isUser ? 'none' : error
          ? '1px solid rgba(242,107,107,0.25)'
          : '1px solid var(--border)',
        color: 'var(--text)',
        fontSize: 14,
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {!isUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: error ? 'var(--red)' : streaming ? 'var(--accent)' : 'var(--accent-bright)',
              boxShadow: streaming ? '0 0 8px var(--accent)' : 'none',
              animation: streaming ? 'pulse-dot 1s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.06em' }}>
              {streaming ? 'THINKING…' : 'AGENT'}
            </span>
          </div>
        )}
        <div>{renderContent(content)}</div>
        {streaming && (
          <span style={{
            display: 'inline-block',
            width: 2,
            height: 14,
            background: 'var(--accent)',
            marginLeft: 2,
            verticalAlign: 'middle',
            animation: 'blink 0.8s step-end infinite',
          }} />
        )}
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
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            opacity: 0.6,
          }} />
        ))}
      </div>
    </div>
  )
}
