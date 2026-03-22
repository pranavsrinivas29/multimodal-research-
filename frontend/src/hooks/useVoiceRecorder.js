import { useState, useRef, useCallback } from 'react'

export function useVoiceRecorder() {
  const [state, setState] = useState('idle') // idle | recording | processing
  const [error, setError] = useState(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRef.current = { recorder, stream }
      recorder.start(100)
      setState('recording')
    } catch (err) {
      setError(err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow mic access and try again.'
        : 'Could not start recording: ' + err.message
      )
    }
  }, [])

  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const { recorder, stream } = mediaRef.current || {}
      if (!recorder) return resolve(null)

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setState('idle')
        resolve(blob)
      }

      setState('processing')
      recorder.stop()
    })
  }, [])

  const cancel = useCallback(() => {
    const { recorder, stream } = mediaRef.current || {}
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    stream?.getTracks().forEach(t => t.stop())
    chunksRef.current = []
    mediaRef.current = null
    setState('idle')
    setError(null)
  }, [])

  return { state, error, start, stop, cancel }
}
