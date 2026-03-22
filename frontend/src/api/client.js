const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function transcribeAudio(blob) {
  const form = new FormData()
  form.append('file', blob, 'recording.webm')
  const res = await fetch(`${BASE}/api/transcribe`, { method: 'POST', body: form })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `Error ${res.status}`)
  return res.json()
}

export async function ingestPdf(file) {
  const form = new FormData()
  form.append('file', file, file.name)
  const res = await fetch(`${BASE}/api/ingest/pdf`, { method: 'POST', body: form })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `Error ${res.status}`)
  return res.json()
}

export async function ingestUrl(url) {
  const res = await fetch(`${BASE}/api/ingest/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `Error ${res.status}`)
  return res.json()
}

export async function fetchSources() {
  const res = await fetch(`${BASE}/api/sources`)
  if (!res.ok) throw new Error('Failed to fetch sources')
  return res.json()
}

export async function deleteSource(sourceId) {
  const res = await fetch(`${BASE}/api/sources/${sourceId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete source')
  return res.json()
}

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`)
  return res.ok
}