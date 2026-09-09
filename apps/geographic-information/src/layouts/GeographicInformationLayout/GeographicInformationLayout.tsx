import { useState } from 'react'
import type { ReactNode } from 'react'
import styles from './GeographicInformationLayout.module.css'
import { Sidebar, TopBar } from '@ocean-cloud/ui'
import { NAVIGATION_ITEMS } from '../../config/navigation'
import { SidebarHeaderSlot, SidebarFooterSlot } from './components/SidebarSlots'
interface GeographicInformationLayoutProps {
  readonly pathname: string
  readonly pageTitle: string
  readonly children: ReactNode
}
export function GeographicInformationLayout({
  pathname,
  pageTitle,
  children,
}: GeographicInformationLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className={styles.shell}>
      <Sidebar
        pathname={pathname}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        navigationItems={NAVIGATION_ITEMS}
        headerSlot={<SidebarHeaderSlot />}
        footerSlot={<SidebarFooterSlot />}
      />
      <div
        className={`${styles.mainLayout}${collapsed ? ` ${styles.mainLayoutCollapsed}` : ''}`}
      >
        <TopBar pageTitle={`GIS${pageTitle}`} />
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          © {new Date().getFullYear()} Ocean Cloud · 地理信息
          <span>连接地图与空间数据。</span>
        </footer>
      </div>
    </div>
  )
}
