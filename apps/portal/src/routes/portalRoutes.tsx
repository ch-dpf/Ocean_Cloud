import type { ReactNode } from 'react'
import { MICRO_APPLICATIONS } from '../config/applications'
import { DashboardPage } from '../pages/DashboardPage/DashboardPage'
import { ApplicationsPage } from '../pages/ApplicationsPage/ApplicationsPage'
import { AboutPage } from '../pages/AboutPage/AboutPage'
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'
import { MicroApplicationFrame } from '../features/micro-applications/components/MicroApplicationFrame/MicroApplicationFrame'
interface PortalRoute {
  readonly title: string
  readonly element: ReactNode
}
const STATIC_ROUTES: Readonly<Record<string, PortalRoute>> = {
  '/': { title: '工作台', element: <DashboardPage /> },
  '/applications': { title: '应用中心', element: <ApplicationsPage /> },
  '/about': { title: '关于平台', element: <AboutPage /> },
}
export function resolvePortalRoute(pathname: string): PortalRoute {
  if (Object.hasOwn(STATIC_ROUTES, pathname)) return STATIC_ROUTES[pathname]!
  const application = MICRO_APPLICATIONS.find((item) => item.path === pathname)
  if (application)
    return {
      title: application.name,
      element: (
        <MicroApplicationFrame key={application.id} application={application} />
      ),
    }
  return { title: '页面不存在', element: <NotFoundPage /> }
}
