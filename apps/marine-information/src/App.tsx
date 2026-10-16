import {
  RequestErrorNotice,
  useHashRoute,
  usePlatformBridge,
} from '@ocean-cloud/ui'
import { MarineInformationLayout } from './layouts/MarineInformationLayout/MarineInformationLayout'
import { resolveMarineRoute } from './routes/marineRoutes'
import { PORTAL_ORIGIN } from './config/application'
import { httpClient } from './services/httpClient'
export function App() {
  const pathname = useHashRoute()
  usePlatformBridge({
    appId: 'marine-information',
    portalOrigin: PORTAL_ORIGIN,
  })
  const route = resolveMarineRoute(pathname)
  return (
    <MarineInformationLayout pathname={pathname} pageTitle={route.title}>
      <RequestErrorNotice client={httpClient} />
      {route.element}
    </MarineInformationLayout>
  )
}
