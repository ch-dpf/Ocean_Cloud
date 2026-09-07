import { useCallback, useEffect, useState } from 'react'
import type { ApplicationDetail } from '../../../types/application'
import { getApplication } from '../services/applicationService'
export function useApplicationDetail(id: string | null) {
  const [detail, setDetail] = useState<ApplicationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const result = await getApplication(id!, controller.signal)
        if (!controller.signal.aborted) {
          setDetail(result)
          setError(null)
        }
      } catch {
        if (!controller.signal.aborted)
          setError('无法读取应用详情，请检查后台连接。')
      } finally {
        if (!controller.signal.aborted)
          timer = setTimeout(() => void poll(), 2000)
      }
    }
    void poll()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [id, revision])
  return {
    detail: detail?.application.id === id ? detail : null,
    error,
    reload,
  }
}
