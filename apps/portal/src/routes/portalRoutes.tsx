import type { ReactNode } from 'react'
import type { MicroApplication } from '../types/application'
import { DashboardPage } from '../pages/DashboardPage/DashboardPage'

import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'
import { ApplicationLaunch } from '../features/applications/components/ApplicationLaunch/ApplicationLaunch'
import { DataServicePage } from '../pages/DataServicePage/DataServicePage'
import { VisualizationPage } from '../pages/VisualizationPage/VisualizationPage'
import { SystemManagementPage } from '../pages/SystemManagementPage/SystemManagementPage'
import { ApplicationRecycleBinPage } from '../pages/ApplicationRecycleBinPage/ApplicationRecycleBinPage'
import { LoginPage } from '../pages/LoginPage/LoginPage'
import { PermissionCenterPage } from '../pages/PermissionCenterPage/PermissionCenterPage'
interface PortalRoute {
  readonly title: string
  readonly element: ReactNode
  /** bare：不套 PortalLayout（登录页等全屏页） */
  readonly layout?: 'shell' | 'bare'
}
const STATIC_ROUTES: Readonly<Record<string, PortalRoute>> = {
  '/login': { title: '登录', element: <LoginPage />, layout: 'bare' },
  '/application-recycle-bin': {
    title: '应用回收站',
    element: <ApplicationRecycleBinPage />,
  },
  '/': { title: '工作台', element: <DashboardPage /> },
  '/dataservice': { title: '数据服务', element: <DataServicePage /> },
  '/visualization': { title: '可视化应用', element: <VisualizationPage /> },
  '/system-management': {
    title: '系统管理',
    element: <SystemManagementPage />,
  },
  '/permission-center': {
    title: '权限中心',
    element: <PermissionCenterPage />,
  },
}
export function resolvePortalRoute(
  pathname: string,
  applications: readonly MicroApplication[],
): PortalRoute {
  if (Object.hasOwn(STATIC_ROUTES, pathname)) return STATIC_ROUTES[pathname]!
  const application = applications.find((item) => item.route === pathname)
  if (application)
    return {
      title: application.name,
      element: (
        <ApplicationLaunch key={application.id} application={application} />
      ),
    }
  return { title: '页面不存在', element: <NotFoundPage /> }
}
