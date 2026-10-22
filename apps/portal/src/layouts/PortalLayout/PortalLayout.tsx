import styles from './PortalLayout.module.css'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar, TopBar, useCurrentUser } from '@ocean-cloud/ui'
import { NAVIGATION_ITEMS } from '../../config/navigation'
import { getUserInfo, logout } from '../../features/auth/services/authService'
interface PortalLayoutProps {
  readonly pathname: string
  readonly pageTitle: string
  /** 二级标题：顶栏展示为「一级 / 二级」 */
  readonly subTitle?: string
  readonly flush: boolean
  readonly children: ReactNode
}
export function PortalLayout({
  pathname,
  pageTitle,
  subTitle,
  flush,
  children,
}: PortalLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  // 顶栏头像与用户详情用的当前登录用户
  const user = useCurrentUser(getUserInfo)
  // 二级路由归一化到一级路径，保持侧边栏父级高亮
  const navPathname = pathname.startsWith('/logs')
    ? '/logs'
    : pathname.startsWith('/system-management')
      ? '/system-management'
      : pathname
  const topBarTitle =
    subTitle === undefined
      ? `${pageTitle} / 全部`
      : `${pageTitle} / ${subTitle}`
  return (
    <div
      className={`${styles.shell}${flush ? ` ${styles.shellContained}` : ''}`}
    >
      <Sidebar
        pathname={navPathname}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        navigationItems={NAVIGATION_ITEMS}
      />
      <div
        className={`${styles.mainLayout}${collapsed ? ` ${styles.mainLayoutCollapsed}` : ''}`}
      >
        <TopBar
          pageTitle={topBarTitle}
          onLogout={() => void logout()}
          user={user}
        />
        <main
          className={`${styles.main}${flush ? ` ${styles.mainFlush}` : ''}`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
