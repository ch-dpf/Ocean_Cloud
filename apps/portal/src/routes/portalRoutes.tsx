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
import { LogPage } from '../pages/LogPage/LogPage'
import { LOG_SECTIONS } from '../features/logs/constants/log'
import { SYSTEM_MANAGEMENT_SECTIONS } from '../features/users/constants/user'
interface PortalRoute {
  readonly title: string
  /** 二级标题：顶栏展示为「一级 / 二级」 */
  readonly subTitle?: string
  readonly element: ReactNode
  /** bare：不套 PortalLayout（登录页等全屏页） */
  readonly layout?: 'shell' | 'bare'
  /** flush：内容区不套主区默认内边距，页面自己控制（左侧二级导航需要贴边） */
  readonly flush?: boolean
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
  // 日志的二级导航：三个日志页共用同一页面，由 activePath 决定展示哪一类
  const logSection = LOG_SECTIONS.find((item) => item.path === pathname)
  if (logSection)
    return {
      title: '日志',
      subTitle: logSection.shortLabel,
      element: <LogPage activePath={logSection.path} />,
      flush: true,
    }
  // 只访问 /logs 时先按第一类日志渲染，PortalContent 会把地址补全到二级路径
  if (pathname === '/logs')
    return {
      title: '日志',
      subTitle: LOG_SECTIONS[0].shortLabel,
      element: <LogPage activePath={LOG_SECTIONS[0].path} />,
      flush: true,
    }
  // 系统管理的二级导航：用户管理已接入接口，其余栏目待接入
  const managementSection = SYSTEM_MANAGEMENT_SECTIONS.find(
    (item) => item.path === pathname,
  )
  if (managementSection)
    return {
      title: '系统管理',
      subTitle: managementSection.shortLabel,
      element: <SystemManagementPage activePath={managementSection.path} />,
      flush: true,
    }
  // 只访问 /system-management 时先按第一栏渲染，PortalContent 会把地址补全到二级路径
  if (pathname === '/system-management')
    return {
      title: '系统管理',
      subTitle: SYSTEM_MANAGEMENT_SECTIONS[0].shortLabel,
      element: (
        <SystemManagementPage activePath={SYSTEM_MANAGEMENT_SECTIONS[0].path} />
      ),
      flush: true,
    }
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
