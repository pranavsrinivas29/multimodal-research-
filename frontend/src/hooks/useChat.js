import { useState, useCallback, useRef } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useChat() {
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'Hello! Upload some sources on the left, then ask me anything about them — by typing or speaking.' }
  ])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef(null)

  const sendMessage = useCallback(async (question) => {
    setMessages(prev => [...prev, { role: 'user', content: question, isNew: true }])
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'agent', content: '', isNew: true, streaming: true }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      })
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
          role: 'agent', content: `Error: ${err.message}`,
          isNew: true, error: true,
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

  const abort = useCallback(() => { abortRef.current?.abort() }, [])
  return { messages, streaming, sendMessage, abort }
}