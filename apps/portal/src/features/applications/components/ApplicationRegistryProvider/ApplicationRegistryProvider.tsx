import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { MicroApplication } from '../../../../types/application'
import { ApplicationRegistryContext } from '../../hooks/applicationRegistryContext'
import { listApplications } from '../../services/applicationService'
interface ApplicationRegistryProviderProps {
  readonly children: ReactNode
}
/**
 * 应用注册接口 /api/applications 后端尚未接入：先关闭请求，避免登录后立刻弹出 404 提示。
 * 关闭期间应用列表为空（工作台计数显示 0，/apps/* 入口不可用）。
 * 后端接入后把这里改成 true 即可恢复，其余代码无需改动。
 */
const APPLICATION_REGISTRY_ENABLED: boolean = false
export function ApplicationRegistryProvider({
  children,
}: ApplicationRegistryProviderProps) {
  const [applications, setApplications] = useState<readonly MicroApplication[]>(
    [],
  )
  // 关闭请求时不处于加载中，避免页面停在「正在读取应用配置…」
  const [isLoading, setIsLoading] = useState(APPLICATION_REGISTRY_ENABLED)
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
    if (!APPLICATION_REGISTRY_ENABLED) return
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
