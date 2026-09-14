import { useState } from 'react'
import type { ReactNode } from 'react'
import styles from './GeographicInformationLayout.module.css'
import { Sidebar, TopBar } from '@ocean-cloud/ui'
import { NAVIGATION_ITEMS } from '../../config/navigation'
import { SidebarHeaderSlot, SidebarFooterSlot } from './components/SidebarSlots'
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
  const [collapsed, setCollapsed] = useState(false)
  // 二级路由归一化到一级路径，保持侧边栏父级高亮
  const navPathname = pathname.startsWith('/data-management')
    ? '/data-management'
    : pathname
  const title = subTitle ? `GIS${pageTitle} / ${subTitle}` : `GIS${pageTitle}`
  return (
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
        <TopBar pageTitle={title} onLogout={() => void logout()} />
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          © {new Date().getFullYear()} Ocean Cloud · 地理信息
          <span>连接地图与空间数据。</span>
        </footer>
      </div>
    </div>
  )
}
