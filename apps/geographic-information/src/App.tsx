import { useEffect } from 'react'
import {
  RequestErrorNotice,
  useHashRoute,
  usePlatformBridge,
} from '@ocean-cloud/ui'
import { GeographicInformationLayout } from './layouts/GeographicInformationLayout/GeographicInformationLayout'
import { resolveGeographicRoute } from './routes/geographicRoutes'
import { PORTAL_ORIGIN } from './config/application'
import { httpClient } from './services/httpClient'
export function App() {
  const pathname = useHashRoute()
  usePlatformBridge({
    appId: 'geographic-information',
    portalOrigin: PORTAL_ORIGIN,
  })
  // 兼容旧入口：/#/ 统一重定向到 #/data-management
  useEffect(() => {
    if (pathname === '/') location.hash = '#/data-management'
  }, [pathname])
  const route = resolveGeographicRoute(pathname)
  return (
    <GeographicInformationLayout
      pathname={pathname}
      pageTitle={route.title}
      subTitle={route.subTitle}
    >
      <RequestErrorNotice client={httpClient} />
      {route.element}
    </GeographicInformationLayout>
  )
}
