import {
  NotFound,
  RequestErrorNotice,
  useHashRoute,
  usePlatformBridge,
} from '@ocean-cloud/ui'
import { MarineInformationPage } from './pages/MarineInformationPage/MarineInformationPage'
import { PORTAL_ORIGIN } from './config/application'
import { httpClient } from './services/httpClient'
export function App() {
  const pathname = useHashRoute()
  const { isEmbedded, portalUrl, navigateHome } = usePlatformBridge({
    appId: 'marine-information',
    portalOrigin: PORTAL_ORIGIN,
  })
  return (
    <>
      <RequestErrorNotice client={httpClient} />
      {pathname === '/' ? (
        <MarineInformationPage
          portalUrl={portalUrl}
          isEmbedded={isEmbedded}
          onNavigateHome={navigateHome}
        />
      ) : (
        <NotFound />
      )}
    </>
  )
}
