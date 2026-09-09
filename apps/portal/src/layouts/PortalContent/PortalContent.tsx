import { useHashRoute, RequestErrorNotice } from '@ocean-cloud/ui'
import { PortalLayout } from '../PortalLayout/PortalLayout'
import { resolvePortalRoute } from '../../routes/portalRoutes'
import { useApplications } from '../../features/applications/hooks/useApplications'
import { httpClient } from '../../services/httpClient'
import { useAuthGuard } from '../../features/auth/hooks/useAuthGuard'
export function PortalContent() {
  const pathname = useHashRoute()
  const allowed = useAuthGuard(pathname)
  const { applications, isLoading, error, refresh } = useApplications()
  const route = resolvePortalRoute(pathname, applications)
  const pendingApplication =
    pathname.startsWith('/apps/') && (isLoading || error)
  // 守卫跳转期间不渲染任何内容
  if (!allowed) return null
  // bare 路由（登录页）不套 PortalLayout
  if (route.layout === 'bare') return route.element
  return (
    <PortalLayout
      pathname={pathname}
      pageTitle={pendingApplication ? '应用入口' : route.title}
    >
      <RequestErrorNotice client={httpClient} />
      {pendingApplication ? (
        <section>
          <p role="status">{error || '正在读取应用配置…'}</p>
          {error && <button onClick={() => void refresh()}>重新加载</button>}
        </section>
      ) : (
        route.element
      )}
    </PortalLayout>
  )
}
