import styles from './PortalLayout.module.css'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar, TopBar } from '@ocean-cloud/ui'
import { NAVIGATION_ITEMS } from '../../config/navigation'
import { logout } from '../../features/auth/services/authService'
interface PortalLayoutProps {
  readonly pathname: string
  readonly pageTitle: string
  readonly children: ReactNode
}
export function PortalLayout({
  pathname,
  pageTitle,
  children,
}: PortalLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className={styles.shell}>
      <Sidebar
        pathname={pathname}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        navigationItems={NAVIGATION_ITEMS}
      />
      <div
        className={`${styles.mainLayout}${collapsed ? ` ${styles.mainLayoutCollapsed}` : ''}`}
      >
        <TopBar
          pageTitle={`${pageTitle} / 全部`}
          onLogout={() => void logout()}
        />
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          © {new Date().getFullYear()} Ocean Cloud · 云海平台
          <span>连接海洋，探索无限。</span>
        </footer>
      </div>
    </div>
  )
}
