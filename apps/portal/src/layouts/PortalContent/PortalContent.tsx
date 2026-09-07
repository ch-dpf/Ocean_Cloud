import { useHashRoute, RequestErrorNotice } from '@ocean-cloud/ui'
import { PortalLayout } from '../PortalLayout/PortalLayout'
import { resolvePortalRoute } from '../../routes/portalRoutes'
import { useApplications } from '../../features/applications/hooks/useApplications'
import { httpClient } from '../../services/httpClient'
export function PortalContent() {
  const pathname = useHashRoute()
  const { applications, isLoading, error, refresh } = useApplications()
  const route = resolvePortalRoute(pathname, applications)
  const pendingApplication =
    pathname.startsWith('/apps/') && (isLoading || error)
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
