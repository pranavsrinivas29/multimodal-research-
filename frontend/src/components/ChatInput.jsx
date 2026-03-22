import React, { useState, useRef } from 'react'
import { MicButton } from './MicButton'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { transcribeAudio } from '../api/client'

export function ChatInput({ onSubmit, disabled }) {
  const [text, setText] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const { state: recState, error: recError, start, stop, cancel } = useVoiceRecorder()
  const textareaRef = useRef(null)

  const handleSend = () => {
    const q = text.trim()
    if (!q) return
    onSubmit(q)
    setText('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMicStop = async () => {
    const blob = await stop()
    if (!blob) return
    setTranscribing(true)
    try {
      const { transcript } = await transcribeAudio(blob)
      setText(prev => prev ? prev + ' ' + transcript : transcript)
      textareaRef.current?.focus()
    } catch (err) {
      console.error('Transcription failed:', err)
    } finally {
      setTranscribing(false)
    }
  }

  const micState = transcribing ? 'processing' : recState

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {recError && (
        <div style={{
          fontSize: 12,
          color: 'var(--red)',
          background: 'rgba(242,107,107,0.06)',
          border: '1px solid rgba(242,107,107,0.2)',
          borderRadius: 8,
          padding: '6px 10px',
        }}>
          {recError}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        transition: 'border-color var(--transition)',
      }}
        onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,106,247,0.35)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            recState === 'recording' ? 'Recording… click stop when done'
            : transcribing ? 'Transcribing…'
            : 'Ask a question, or press the mic to speak…'
          }
          disabled={disabled || recState === 'recording' || transcribing}
          rows={1}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            fontSize: 14,
            lineHeight: 1.6,
            resize: 'none',
            minHeight: 24,
            maxHeight: 120,
            overflowY: 'auto',
            paddingTop: 2,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <MicButton
            state={micState}
            onStart={start}
            onStop={handleMicStop}
            onCancel={cancel}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: text.trim() && !disabled ? 'var(--accent)' : 'var(--bg2)',
              color: text.trim() && !disabled ? '#fff' : 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition)',
              flexShrink: 0,
            }}
            title="Send"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
