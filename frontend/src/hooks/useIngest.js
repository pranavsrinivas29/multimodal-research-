import { useState, useCallback } from 'react'
import { ingestPdf, ingestUrl } from '../api/client'

export function useIngest() {
  const [ingesting, setIngesting] = useState({})

  const ingest = useCallback(async (source) => {
    const key = source.label
    setIngesting(prev => ({ ...prev, [key]: 'loading' }))
    try {
      const result = source.type === 'pdf'
        ? await ingestPdf(source.value)
        : await ingestUrl(source.value)
      setIngesting(prev => ({ ...prev, [key]: 'done' }))
      return result
    } catch (err) {
      setIngesting(prev => ({ ...prev, [key]: 'error' }))
      throw err
    }
  }, [])

  return { ingesting, ingest }
}