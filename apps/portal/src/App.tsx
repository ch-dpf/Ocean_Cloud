import { PortalLayout } from './layouts/PortalLayout/PortalLayout'
import { useHashRoute } from '@ocean-cloud/ui'
import { resolvePortalRoute } from './routes/portalRoutes'
import { RequestErrorNotice } from '@ocean-cloud/ui'
import { httpClient } from './services/httpClient'
export function App() {
  const pathname = useHashRoute()
  const route = resolvePortalRoute(pathname)
  return (
    <PortalLayout pathname={pathname} pageTitle={route.title}>
      <RequestErrorNotice client={httpClient} />
      {route.element}
    </PortalLayout>
  )
}
