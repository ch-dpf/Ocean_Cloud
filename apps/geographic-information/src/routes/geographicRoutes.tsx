import type { ReactNode } from 'react'
import { NotFound } from '@ocean-cloud/ui'
import { DataManagementPage } from '../pages/DataManagementPage/DataManagementPage'
import { DataProcessingPage } from '../pages/DataProcessingPage/DataProcessingPage'
import { DataPublishingPage } from '../pages/DataPublishingPage/DataPublishingPage'
import { DATA_MANAGEMENT_SECTIONS } from '../config/navigation'
interface GeographicRoute {
  readonly title: string
  readonly subTitle?: string
  readonly element: ReactNode
}
const STATIC_ROUTES: Readonly<Record<string, GeographicRoute>> = {
  '/data-processing': { title: '数据处理', element: <DataProcessingPage /> },
  '/data-publishing': { title: '数据发布', element: <DataPublishingPage /> },
}
export function resolveGeographicRoute(pathname: string): GeographicRoute {
  if (Object.hasOwn(STATIC_ROUTES, pathname)) return STATIC_ROUTES[pathname]!
  // 兼容旧入口：/#/ 视作数据管理默认页
  const target = pathname === '/' ? '/data-management' : pathname
  const section = DATA_MANAGEMENT_SECTIONS.find((item) => item.path === target)
  if (section) {
    return {
      title: '数据管理',
      subTitle: section.label,
      element: <DataManagementPage activePath={section.path} />,
    }
  }
  return { title: '页面未找到', element: <NotFound /> }
}
