import { ResourcesPage } from './pages/ResourcesPage/ResourcesPage'
import { NotFound, RequestErrorNotice } from '@ocean-cloud/ui'
import { httpClient } from './services/httpClient'
import { useHashRoute } from '@ocean-cloud/ui'
import { usePlatformBridge } from './hooks/usePlatformBridge'
export function App() {
  const pathname = useHashRoute()
  const { isEmbedded, platformName, navigateHome } = usePlatformBridge()
  return (
    <>
      <RequestErrorNotice client={httpClient} />
      {pathname === '/' ? (
        <ResourcesPage
          isEmbedded={isEmbedded}
          platformName={platformName}
          onNavigateHome={navigateHome}
        />
      ) : (
        <NotFound />
      )}
    </>
  )
}
