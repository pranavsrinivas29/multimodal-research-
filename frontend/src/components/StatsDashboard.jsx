import React, { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function StatsDashboard({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE}/api/stats`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const m = data?.metrics || {}

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 360, background: 'var(--bg)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 10, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>MLflow Tracking</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {loading ? 'Loading…' : `${data?.runs || 0} runs logged`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href="http://localhost:5001"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11, color: 'var(--accent-bright)',
              textDecoration: 'none', padding: '3px 8px',
              border: '1px solid rgba(124,106,247,0.3)',
              borderRadius: 6,
            }}
          >
            Open MLflow UI ↗
          </a>
          <button onClick={onClose} style={{
            background: 'none', color: 'var(--text-muted)', fontSize: 18, padding: '0 4px',
          }}>×</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {loading && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Fetching metrics…
          </div>
        )}

        {!loading && data?.error && (
          <div style={{ fontSize: 12, color: 'var(--red)' }}>
            Could not connect to MLflow: {data.error}
          </div>
        )}

        {!loading && !data?.error && (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <MetricCard label="Avg latency" value={m.avg_latency_ms ? `${m.avg_latency_ms}ms` : '—'} color="var(--accent)" />
              <MetricCard label="Total cost" value={m.total_cost_usd ? `$${m.total_cost_usd}` : '—'} color="var(--green)" />
              <MetricCard label="Avg faithfulness" value={m.avg_eval_score != null ? `${(m.avg_eval_score * 100).toFixed(0)}%` : '—'} color="var(--accent-bright)" />
              <MetricCard label="Avg retrieval" value={m.avg_retrieval_score ? m.avg_retrieval_score.toFixed(3) : '—'} color="#f26b6b" />
            </div>

            {/* Total tokens */}
            {m.total_tokens > 0 && (
              <div style={{
                padding: '10px 12px', background: 'var(--bg3)',
                border: '1px solid var(--border)', borderRadius: 10,
                fontSize: 12, color: 'var(--text-muted)',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>Total tokens used</span>
                <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {m.total_tokens.toLocaleString()}
                </span>
              </div>
            )}

            {/* Recent runs */}
            {data?.recent?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
                  RECENT RUNS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.recent.map((run, i) => (
                    <div key={run.run_id} style={{
                      padding: '8px 10px', background: 'var(--bg3)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      fontSize: 12,
                    }}>
                      <div style={{
                        color: 'var(--text)', marginBottom: 4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {run.question || '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>{run.latency_ms}ms</span>
                        <span>{run.total_tokens} tok</span>
                        <span>${run.cost_usd}</span>
                        {run.eval_score >= 0 && (
                          <span style={{ color: run.eval_score > 0.7 ? 'var(--green)' : 'var(--red)' }}>
                            faith: {(run.eval_score * 100).toFixed(0)}%
                          </span>
                        )}
                        <span style={{ color: 'var(--accent)' }}>
                          ret: {run.retrieval_score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data?.runs === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>
                No runs yet. Ask a question to start tracking.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, color }) {
  return (
    <div style={{
      padding: '10px 12px', background: 'var(--bg3)',
      border: '1px solid var(--border)', borderRadius: 10,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
    </div>
  )
}
