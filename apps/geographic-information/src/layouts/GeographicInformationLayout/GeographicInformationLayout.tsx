import { useState } from 'react'
import type { ReactNode } from 'react'
import styles from './GeographicInformationLayout.module.css'
import { Sidebar, TopBar, useCurrentUser } from '@ocean-cloud/ui'
import { PageHeadingContext } from '../../hooks/usePageHeading'
import { NAVIGATION_ITEMS } from '../../config/navigation'
import { SidebarHeaderSlot, SidebarFooterSlot } from './components/SidebarSlots'
import { getUserInfo } from '../../features/auth/userInfo'
import { logout } from '../../features/auth/logout'
interface GeographicInformationLayoutProps {
  readonly pathname: string
  readonly pageTitle: string
  readonly subTitle?: string
  readonly children: ReactNode
}
export function GeographicInformationLayout({
  pathname,
  pageTitle,
  subTitle,
  children,
}: GeographicInformationLayoutProps) {
  // 进入地理信息默认收起侧边栏，给业务内容留出更多空间
  const [collapsed, setCollapsed] = useState(true)
  // 页面内的选中态（如数据集）可覆盖顶栏标题；为空时使用路由标题
  const [pageHeading, setPageHeading] = useState<string | null>(null)
  // 顶栏头像与用户详情用的当前登录用户
  const user = useCurrentUser(getUserInfo)
  // 二级路由归一化到一级路径，保持侧边栏父级高亮
  const navPathname = pathname.startsWith('/data-management')
    ? '/data-management'
    : pathname.startsWith('/data-processing')
      ? '/data-processing'
      : pathname.startsWith('/data-publishing')
        ? '/data-publishing'
        : pathname
  const routeTitle = subTitle ? `${pageTitle} / ${subTitle}` : `${pageTitle}`
  const title = pageHeading ?? routeTitle
  return (
    <PageHeadingContext.Provider value={setPageHeading}>
      <div className={styles.shell}>
        <Sidebar
          pathname={navPathname}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          navigationItems={NAVIGATION_ITEMS}
          headerSlot={<SidebarHeaderSlot />}
          footerSlot={<SidebarFooterSlot />}
        />
        <div
          className={`${styles.mainLayout}${collapsed ? ` ${styles.mainLayoutCollapsed}` : ''}`}
        >
          <TopBar
            pageTitle={title}
            onLogout={() => void logout()}
            user={user}
          />
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </PageHeadingContext.Provider>
  )
}
