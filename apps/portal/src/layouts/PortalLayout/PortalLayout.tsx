import styles from './PortalLayout.module.css'
import type { ReactNode } from 'react'
import { Sidebar } from './components/Sidebar/Sidebar'
import { TopBar } from './components/TopBar/TopBar'
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
  return (
    <div className={styles.shell}>
      <Sidebar pathname={pathname} />
      <div className={styles.mainLayout}>
        <TopBar pageTitle={pageTitle} />
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          © {new Date().getFullYear()} Ocean Cloud · 云海平台
          <span>连接海洋，探索无限。</span>
        </footer>
      </div>
    </div>
  )
}
