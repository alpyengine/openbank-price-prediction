import { useState, useEffect, useCallback } from 'react'

const SERVER = '/api'
const MAX_RETRIES = 3
const RETRY_DELAY = 1200

export function useServerHealth() {
  const [status, setStatus] = useState('checking') // 'checking' | 'ok' | 'error'
  const [info, setInfo]     = useState(null)

  const check = useCallback(async (attempt = 0) => {
    setStatus('checking')
    try {
      const ctrl = new AbortController()
      const tid  = setTimeout(() => ctrl.abort(), 3000)
      const res  = await fetch(`${SERVER}/health`, { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(tid)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      setInfo(data)
      setStatus('ok')
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        setTimeout(() => check(attempt + 1), RETRY_DELAY)
      } else {
        setStatus('error')
      }
    }
  }, [])

  useEffect(() => { check() }, [check])

  return { status, info, retry: check }
}
