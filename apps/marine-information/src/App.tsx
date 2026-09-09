import {
  NotFound,
  RequestErrorNotice,
  TopBar,
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
      <TopBar pageTitle="海洋信息" />
      {pathname === '/' ? (
        <MarineInformationPage
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
