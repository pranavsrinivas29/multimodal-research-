const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const stored = localStorage.getItem('auth')
  const token = stored ? JSON.parse(stored).token : null
  return token
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('auth')
    window.location.reload()
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Error ${res.status}`)
  }
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function transcribeAudio(blob) {
  const stored = localStorage.getItem('auth')
  const token = stored ? JSON.parse(stored).token : null
  const form = new FormData()
  form.append('file', blob, 'recording.webm')
  const res = await fetch(`${BASE}/api/transcribe`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: form,
  })
  return handleResponse(res)
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

export async function ingestPdf(file) {
  const stored = localStorage.getItem('auth')
  const token = stored ? JSON.parse(stored).token : null
  const form = new FormData()
  form.append('file', file, file.name)
  const res = await fetch(`${BASE}/api/ingest/pdf`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: form,
  })
  return handleResponse(res)
}

export async function ingestUrl(url) {
  const res = await fetch(`${BASE}/api/ingest/url`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ url }),
  })
  return handleResponse(res)
}

export async function fetchSources() {
  const res = await fetch(`${BASE}/api/sources`, { headers: authHeaders() })
  return handleResponse(res)
}

export async function deleteSource(sourceId) {
  const res = await fetch(`${BASE}/api/sources/${sourceId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handleResponse(res)
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`)
  return res.ok
}
