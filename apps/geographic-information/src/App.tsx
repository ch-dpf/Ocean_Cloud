import {
  NotFound,
  RequestErrorNotice,
  TopBar,
  useHashRoute,
  usePlatformBridge,
} from '@ocean-cloud/ui'
import { GeographicInformationPage } from './pages/GeographicInformationPage/GeographicInformationPage'
import { PORTAL_ORIGIN } from './config/application'
import { httpClient } from './services/httpClient'
export function App() {
  const pathname = useHashRoute()
  const { isEmbedded, portalUrl, navigateHome } = usePlatformBridge({
    appId: 'geographic-information',
    portalOrigin: PORTAL_ORIGIN,
  })
  return (
    <>
      <RequestErrorNotice client={httpClient} />
      <TopBar pageTitle="地理信息" />
      {pathname === '/' ? (
        <GeographicInformationPage
          portalUrl={portalUrl}
          isEmbedded={isEmbedded}
          onNavigateHome={navigateHome}
          showChrome={false}
        />
      ) : (
        <NotFound />
      )}
    </>
  )
}
