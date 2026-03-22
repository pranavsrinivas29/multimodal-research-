import React, { useEffect, useRef } from 'react'

export function MicButton({ state, onStart, onStop, onCancel }) {
  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'
  const isActive = isRecording || isProcessing

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        onClick={isRecording ? onStop : isProcessing ? undefined : onStart}
        disabled={isProcessing}
        style={{
          position: 'relative',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: isRecording
            ? 'rgba(242,107,107,0.15)'
            : isProcessing
            ? 'rgba(124,106,247,0.1)'
            : 'rgba(124,106,247,0.08)',
          border: `1.5px solid ${isRecording ? 'rgba(242,107,107,0.5)' : isProcessing ? 'rgba(124,106,247,0.4)' : 'rgba(124,106,247,0.25)'}`,
          color: isRecording ? '#f26b6b' : '#a594ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.18s ease',
          flexShrink: 0,
          cursor: isProcessing ? 'wait' : 'pointer',
          animation: isRecording ? 'pulse-ring 1.5s ease-in-out infinite' : 'none',
        }}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isProcessing ? (
          <SpinnerIcon />
        ) : isRecording ? (
          <StopIcon />
        ) : (
          <MicIcon />
        )}
      </button>

      {isActive && (
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            color: 'var(--text-muted)',
            fontSize: 12,
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
          }}
        >
          cancel
        </button>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="9" y1="22" x2="15" y2="22"/>
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
    </svg>
  )
}
