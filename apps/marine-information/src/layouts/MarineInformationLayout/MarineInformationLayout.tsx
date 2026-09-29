import { useState } from 'react'
import type { ReactNode } from 'react'
import styles from './MarineInformationLayout.module.css'
import { Sidebar, TopBar, useCurrentUser } from '@ocean-cloud/ui'
import { NAVIGATION_ITEMS } from '../../config/navigation'
import { SidebarHeaderSlot, SidebarFooterSlot } from './components/SidebarSlots'
import { getUserInfo } from '../../features/auth/userInfo'
import { logout } from '../../features/auth/logout'
interface MarineInformationLayoutProps {
  readonly pathname: string
  readonly pageTitle: string
  readonly children: ReactNode
}
export function MarineInformationLayout({
  pathname,
  pageTitle,
  children,
}: MarineInformationLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  // 顶栏头像与用户详情用的当前登录用户
  const user = useCurrentUser(getUserInfo)
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
        <TopBar
          pageTitle={`海洋${pageTitle}`}
          onLogout={() => void logout()}
          user={user}
        />
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          © {new Date().getFullYear()} Ocean Cloud · 海洋信息
          <span>连接海洋，探索无限。</span>
        </footer>
      </div>
    </div>
  )
}
