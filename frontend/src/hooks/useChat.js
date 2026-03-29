import { useState, useCallback, useRef, useEffect } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function generateSessionId() {
  return 'session_' + Math.random().toString(36).slice(2, 11)
}

function getToken() {
  const stored = localStorage.getItem('auth')
  return stored ? JSON.parse(stored).token : null
}

function authHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }
}

const WELCOME = 'Hello! Upload some sources on the left, then ask me anything about them — by typing or speaking.'
const WELCOME_BACK = 'Welcome back! Here is your previous conversation.'

export function useChat(userId) {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const sessionId = useRef(generateSessionId())
  const abortRef = useRef(null)
  const loadedForUser = useRef(null) // track which user we already loaded for

  useEffect(() => {
    // Only load if userId exists and we haven't loaded for this user yet
    if (!userId || loadedForUser.current === userId) return

    loadedForUser.current = userId
    sessionId.current = generateSessionId()

    // Immediately clear messages so old user's chat doesn't flash
    setMessages([])
    setHistoryLoading(true)

    fetch(`${BASE}/api/auth/history`, { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load history')
        return r.json()
      })
      .then(data => {
        const msgs = (data.messages || []).map(m => ({
          role: m.role === 'assistant' ? 'agent' : 'user',
          content: m.content,
        }))
        setMessages(msgs.length > 0
          ? [{ role: 'agent', content: WELCOME_BACK }, ...msgs]
          : [{ role: 'agent', content: WELCOME }]
        )
      })
      .catch(() => {
        setMessages([{ role: 'agent', content: WELCOME }])
      })
      .finally(() => setHistoryLoading(false))

  }, [userId])

  // When user logs out (userId becomes null), reset everything
  useEffect(() => {
    if (!userId) {
      loadedForUser.current = null
      setMessages([])
      setHistoryLoading(false)
      sessionId.current = generateSessionId()
    }
  }, [userId])

  const sendMessage = useCallback(async (question) => {
    setMessages(prev => [...prev, { role: 'user', content: question, isNew: true }])
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'agent', content: '', isNew: true, streaming: true }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ question, session_id: sessionId.current }),
        signal: controller.signal,
      })

      if (res.status === 401) {
        localStorage.removeItem('auth')
        window.location.reload()
        return
      }
      if (!res.ok) throw new Error(`Server error ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const token = line.slice(6)
          if (token === '[DONE]') break
          const text = token.replace(/\\n/g, '\n')
          setMessages(prev => {
            const next = [...prev]
            const last = next[next.length - 1]
            next[next.length - 1] = { ...last, content: last.content + text }
            return next
          })
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = {
          role: 'agent',
          content: `Error: ${err.message}`,
          isNew: true,
          error: true,
        }
        return next
      })
    } finally {
      setMessages(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        next[next.length - 1] = { ...last, streaming: false }
        return next
      })
      setStreaming(false)
    }
  }, [])

  const clearChat = useCallback(async () => {
    await fetch(`${BASE}/api/chat/${sessionId.current}`, {
      method: 'DELETE', headers: authHeaders(),
    }).catch(() => {})
    await fetch(`${BASE}/api/auth/history`, {
      method: 'DELETE', headers: authHeaders(),
    }).catch(() => {})
    sessionId.current = generateSessionId()
    setMessages([{ role: 'agent', content: 'Chat cleared. Ask me anything about your sources.' }])
  }, [])

  const abort = useCallback(() => { abortRef.current?.abort() }, [])

  return {
    messages,
    streaming,
    historyLoading,
    sendMessage,
    abort,
    clearChat,
    sessionId: sessionId.current,
  }
}
