import type { ReactNode } from 'react'
import styles from './Sidebar.module.css'
import { Brand } from '../Brand/Brand'
import sidebarControlIcon from './assets/SidebarControl.svg'
import sidebarControlActiveIcon from './assets/SidebarControl_blue.svg'

export interface SidebarNavItem {
  readonly path: string
  readonly label: string
  /** 默认态图标（import 后的 URL） */
  readonly icon: string
  /** 激活态图标；提供时启用双图层 hover/active 切换 */
  readonly activeIcon?: string
}

interface SidebarProps {
  readonly pathname: string
  readonly collapsed: boolean
  readonly onToggleCollapse: () => void
  /** 各应用自行提供的导航数据，组件内不耦合业务配置 */
  readonly navigationItems: ReadonlyArray<SidebarNavItem>
  /** logo 与导航之间的插槽（收起态隐藏） */
  readonly headerSlot?: ReactNode
  /** 导航与收起按钮之间的插槽（收起态隐藏） */
  readonly footerSlot?: ReactNode
}

export function Sidebar({
  pathname,
  collapsed,
  onToggleCollapse,
  navigationItems,
  headerSlot,
  footerSlot,
}: SidebarProps) {
  return (
    <aside
      className={`${styles.sidebar}${collapsed ? ` ${styles.sidebarCollapsed}` : ''}`}
    >
      <Brand collapsed={collapsed} />
      {headerSlot && <div className={styles.sidebarSlot}>{headerSlot}</div>}
      <nav className={styles.sidebarNav}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.path
          return (
              <a
              key={item.path}
              href={`#${item.path}`}
              title={item.label}
              className={`${styles.sidebarNavItem}${isActive ? ` ${styles.sidebarNavItemActive}` : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`${styles.sidebarNavIcon}${item.activeIcon ? ` ${styles.sidebarNavIconDual}` : ''}`}
              >
                <img
                  src={item.icon}
                  alt=""
                  className={styles.sidebarNavIconDefault}
                />
                {item.activeIcon && (
                  <img
                    src={item.activeIcon}
                    alt=""
                    className={styles.sidebarNavIconActive}
                  />
                )}
              </div>
              <span className={styles.sidebarNavText}>{item.label}</span>
            </a>
          )
        })}
      </nav>
      {footerSlot && <div className={styles.sidebarSlot}>{footerSlot}</div>}
      <button
        type="button"
        className={styles.sidebarCollapse}
        onClick={onToggleCollapse}
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        <div className={styles.sidebarCollapseIcon}>
          <img
            src={sidebarControlIcon}
            alt=""
            className={styles.sidebarCollapseIconDefault}
          />
          <img
            src={sidebarControlActiveIcon}
            alt=""
            className={styles.sidebarCollapseIconActive}
          />
        </div>
        <span className={styles.sidebarCollapseText}>收起侧边栏</span>
      </button>
    </aside>
  )
}
