import type { ReactNode } from 'react'
import { NotFound } from '@ocean-cloud/ui'
import { DataManagementPage } from '../pages/DataManagementPage/DataManagementPage'
import { DataProcessingPage } from '../pages/DataProcessingPage/DataProcessingPage'
import { DataPublishingPage } from '../pages/DataPublishingPage/DataPublishingPage'
interface GeographicRoute {
  readonly title: string
  readonly element: ReactNode
}
const STATIC_ROUTES: Readonly<Record<string, GeographicRoute>> = {
  '/': { title: '数据管理', element: <DataManagementPage /> },
  '/data-processing': { title: '数据处理', element: <DataProcessingPage /> },
  '/data-publishing': { title: '数据发布', element: <DataPublishingPage /> },
}
export function resolveGeographicRoute(pathname: string): GeographicRoute {
  if (Object.hasOwn(STATIC_ROUTES, pathname)) return STATIC_ROUTES[pathname]!
  return { title: '页面未找到', element: <NotFound /> }
}
