import React, { useState, useRef, useEffect } from 'react'
import { useIngest } from '../hooks/useIngest'
import { fetchSources, deleteSource } from '../api/client'

export function SourceUploader({ onSourcesChange }) {
  const [pending, setPending] = useState([])   // local, not yet indexed
  const [indexed, setIndexed] = useState([])   // confirmed in backend
  const [urlInput, setUrlInput] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const { ingesting, ingest } = useIngest()

  // Load already-indexed sources on mount
  useEffect(() => {
    fetchSources()
      .then(rows => { setIndexed(rows); onSourcesChange?.(rows) })
      .catch(() => {})
  }, [])

  const addPending = (sources) => {
    setPending(prev => {
      const next = [...prev, ...sources]
      return next
    })
  }

  const addFiles = (files) => {
    const pdfs = Array.from(files)
      .filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
      .map(f => ({ type: 'pdf', label: f.name, value: f }))
    addPending(pdfs)
  }

  const addUrl = () => {
    const u = urlInput.trim()
    if (!u) return
    const full = u.startsWith('http') ? u : 'https://' + u
    addPending([{ type: 'url', label: full, value: full }])
    setUrlInput('')
  }

  const removePending = (i) => setPending(prev => prev.filter((_, idx) => idx !== i))

  const removeIndexed = async (sourceId) => {
    try {
      await deleteSource(sourceId)
      const next = indexed.filter(s => s.source_id !== sourceId)
      setIndexed(next)
      onSourcesChange?.(next)
    } catch {
      setError('Failed to delete source')
    }
  }

  const handleIngestAll = async () => {
    setError(null)
    const toIngest = [...pending]
    setPending([])
    for (const source of toIngest) {
      try {
        const result = await ingest(source)
        setIndexed(prev => {
          const next = [result, ...prev]
          onSourcesChange?.(next)
          return next
        })
      } catch (err) {
        setError(`Failed to index "${source.label}": ${err.message}`)
      }
    }
  }

  const totalIngesting = Object.values(ingesting).filter(v => v === 'loading').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 500 }}>
        SOURCES
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer',
          background: dragging ? 'var(--accent-glow)' : 'transparent',
          transition: 'all var(--transition)',
          fontSize: 13, color: 'var(--text-muted)',
        }}
      >
        <PdfIcon /> Drop PDFs or click to browse
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple
          style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
      </div>

      {/* URL input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addUrl()}
          placeholder="Paste a URL…"
          style={{
            flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '8px 12px', color: 'var(--text)', fontSize: 13,
          }}
        />
        <button onClick={addUrl} disabled={!urlInput.trim()} style={{
          padding: '8px 14px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13,
          background: urlInput.trim() ? 'var(--accent)' : 'var(--bg3)',
          color: urlInput.trim() ? '#fff' : 'var(--text-dim)',
          border: '1px solid transparent', transition: 'all var(--transition)',
        }}>Add</button>
      </div>

      {/* Pending list + index button */}
      {pending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pending ({pending.length})</div>
          {pending.map((s, i) => (
            <SourceRow key={i} source={s} status="pending" onRemove={() => removePending(i)} />
          ))}
          <button onClick={handleIngestAll} disabled={totalIngesting > 0} style={{
            marginTop: 4, padding: '8px', borderRadius: 10, fontFamily: 'inherit',
            fontSize: 13, fontWeight: 500,
            background: 'var(--accent)', color: '#fff',
            border: 'none', transition: 'opacity var(--transition)',
            opacity: totalIngesting > 0 ? 0.5 : 1,
          }}>
            {totalIngesting > 0 ? `Indexing… (${totalIngesting} left)` : `Index ${pending.length} source${pending.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          fontSize: 12, color: 'var(--red)', background: 'rgba(242,107,107,0.06)',
          border: '1px solid rgba(242,107,107,0.2)', borderRadius: 8, padding: '6px 10px',
        }}>
          {error}
        </div>
      )}

      {/* Indexed list */}
      {indexed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Indexed ({indexed.length})</div>
          {indexed.map(s => (
            <SourceRow
              key={s.source_id}
              source={{ type: s.source_type, label: s.label }}
              status="indexed"
              chunks={s.chunk_count}
              onRemove={() => removeIndexed(s.source_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SourceRow({ source, status, chunks, onRemove }) {
  const statusColor = status === 'indexed' ? 'var(--green)' : status === 'error' ? 'var(--red)' : 'var(--text-muted)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px', background: 'var(--bg3)',
      border: '1px solid var(--border)', borderRadius: 8, fontSize: 12,
    }}>
      <div style={{ color: source.type === 'pdf' ? '#f26b6b' : '#7c6af7', flexShrink: 0 }}>
        {source.type === 'pdf' ? <PdfIcon size={14} /> : <LinkIcon size={14} />}
      </div>
      <span style={{
        color: 'var(--text-muted)', flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
      }}>{source.label}</span>
      {chunks && (
        <span style={{ fontSize: 10, color: statusColor, flexShrink: 0 }}>
          {chunks} chunks
        </span>
      )}
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
      <button onClick={onRemove} style={{
        color: 'var(--text-dim)', background: 'none', fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0,
      }}>×</button>
    </div>
  )
}

function PdfIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
    </svg>
  )
}
function LinkIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}
