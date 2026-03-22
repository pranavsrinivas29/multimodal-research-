import React, { useRef, useEffect, useState } from 'react'
import { ChatInput } from './components/ChatInput'
import { ChatMessage } from './components/ChatMessage'
import { SourceUploader } from './components/SourceUploader'
import { StatusBar } from './components/StatusBar'
import { StatsDashboard } from './components/StatsDashboard'
import { useChat } from './hooks/useChat'

export default function App() {
  const { messages, streaming, sendMessage, abort } = useChat()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [statsOpen, setStatsOpen] = useState(false)
  const [sources, setSources] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <header style={{
        height: 52, borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0, background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{
            background: 'none', color: 'var(--text-muted)', padding: 4,
            borderRadius: 6, display: 'flex', alignItems: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Research Agent</span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(61,214,140,0.12)', color: 'var(--green)',
            fontWeight: 500, letterSpacing: '0.05em',
          }}>PHASE 4</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Stats toggle */}
          <button
            onClick={() => setStatsOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: statsOpen ? 'var(--accent-bright)' : 'var(--text-muted)',
              background: statsOpen ? 'rgba(124,106,247,0.1)' : 'none',
              border: `1px solid ${statsOpen ? 'rgba(124,106,247,0.3)' : 'var(--border)'}`,
              borderRadius: 8, padding: '4px 10px', fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            MLflow
          </button>
          <StatusBar />
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={{
            width: 280, borderRight: '1px solid var(--border)',
            padding: '16px', display: 'flex', flexDirection: 'column',
            gap: 20, overflowY: 'auto', flexShrink: 0, background: 'var(--bg)',
          }}>
            <SourceUploader onSourcesChange={setSources} />
            {sources.length > 0 && (
              <div style={{
                marginTop: 'auto', padding: '10px 12px',
                background: 'rgba(61,214,140,0.05)',
                border: '1px solid rgba(61,214,140,0.15)',
                borderRadius: 10, fontSize: 12, color: 'var(--green)',
              }}>
                {sources.length} source{sources.length > 1 ? 's' : ''} indexed — ask anything
              </div>
            )}
          </aside>
        )}

        {/* Chat */}
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', background: 'var(--bg2)',
          marginRight: statsOpen ? 360 : 0,
          transition: 'margin-right 0.2s ease',
        }}>
          <div style={{
            flex: 1, overflowY: 'auto', padding: '24px 28px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {messages.map((m, i) => (
              <ChatMessage key={i} {...m} />
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '14px 24px 18px', background: 'var(--bg)',
          }}>
            {streaming && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <button onClick={abort} style={{
                  fontSize: 12, color: 'var(--text-muted)',
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '4px 12px', fontFamily: 'inherit',
                }}>
                  Stop generating
                </button>
              </div>
            )}
            <ChatInput onSubmit={sendMessage} disabled={streaming} />
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
              Press Enter to send · Shift+Enter for newline · Click mic to speak
            </div>
          </div>
        </main>

        {/* Stats panel */}
        {statsOpen && <StatsDashboard onClose={() => setStatsOpen(false)} />}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0) } 40% { transform:translateY(-6px) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes pulse-ring { 0%,100% { box-shadow:0 0 0 0 rgba(242,107,107,0.3) } 50% { box-shadow:0 0 0 8px rgba(242,107,107,0) } }
        @keyframes pulse-dot { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
      `}</style>
    </div>
  )
}
