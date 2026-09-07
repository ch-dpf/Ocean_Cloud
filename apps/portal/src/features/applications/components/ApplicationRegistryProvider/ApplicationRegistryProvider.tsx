import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { MicroApplication } from '../../../../types/application'
import { ApplicationRegistryContext } from '../../hooks/applicationRegistryContext'
import { listApplications } from '../../services/applicationService'
interface ApplicationRegistryProviderProps {
  readonly children: ReactNode
}
export function ApplicationRegistryProvider({
  children,
}: ApplicationRegistryProviderProps) {
  const [applications, setApplications] = useState<readonly MicroApplication[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    await Promise.resolve()
    if (request.signal.aborted) return
    setIsLoading(true)
    try {
      const result = await listApplications(request.signal)
      if (!request.signal.aborted) {
        setApplications(result)
        setError(null)
      }
    } catch {
      if (!request.signal.aborted)
        setError('无法连接应用管理服务，请确认后台服务已启动。')
    } finally {
      if (!request.signal.aborted) setIsLoading(false)
    }
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => {
      window.clearTimeout(timer)
      controller.current?.abort()
    }
  }, [refresh])
  return (
    <ApplicationRegistryContext
      value={{ applications, isLoading, error, refresh }}
    >
      {children}
    </ApplicationRegistryContext>
  )
}
