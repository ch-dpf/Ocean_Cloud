import type { ReactNode } from 'react'
import type { MicroApplication } from '../types/application'
import { DashboardPage } from '../pages/DashboardPage/DashboardPage'
import { ApplicationsPage } from '../pages/ApplicationsPage/ApplicationsPage'
import { AboutPage } from '../pages/AboutPage/AboutPage'
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'
import { ApplicationLaunch } from '../features/applications/components/ApplicationLaunch/ApplicationLaunch'
import { ApplicationManagementPage } from '../pages/ApplicationManagementPage/ApplicationManagementPage'
import { ApplicationRecycleBinPage } from '../pages/ApplicationRecycleBinPage/ApplicationRecycleBinPage'
interface PortalRoute {
  readonly title: string
  readonly element: ReactNode
}
const STATIC_ROUTES: Readonly<Record<string, PortalRoute>> = {
  '/application-recycle-bin': {
    title: '应用回收站',
    element: <ApplicationRecycleBinPage />,
  },
  '/': { title: '工作台', element: <DashboardPage /> },
  '/applications': { title: '应用中心', element: <ApplicationsPage /> },
  '/application-management': {
    title: '应用管理',
    element: <ApplicationManagementPage />,
  },
  '/about': { title: '关于平台', element: <AboutPage /> },
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
