import styles from './Sidebar.module.css'
import { NAVIGATION_ITEMS } from '../../../../config/navigation'
interface SidebarProps {
  readonly pathname: string
  readonly collapsed: boolean
  readonly onToggleCollapse: () => void
}
export function Sidebar({ pathname, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={`${styles.sidebar}${collapsed ? ` ${styles.sidebarCollapsed}` : ''}`}
    >
      <div className={styles.brand}>
        <div className={styles.logoIcon}>
          <img src="/OceanCloudLogo.svg" alt="logo" />
        </div>
        <span className={styles.logoName}>云海 Ocean Cloud</span>
      </div>
      {/* 下方：导航栏 */}
      <nav className={styles.sidebarNav}>
        {NAVIGATION_ITEMS.map((item) => {
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
                <img src={item.icon} alt="" className={styles.sidebarNavIconDefault} />
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
      {/* 底部：收起侧边栏 */}
      <button
        type="button"
        className={styles.sidebarCollapse}
        onClick={onToggleCollapse}
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        <div className={styles.sidebarCollapseIcon}>
          <img src="/icons/SidebarControl.svg" alt="" className={styles.sidebarCollapseIconDefault} />
          <img src="/icons/SidebarControl_blue.svg" alt="" className={styles.sidebarCollapseIconActive} />
        </div>
        <span className={styles.sidebarCollapseText}>收起侧边栏</span>
      </button>
    </aside>
  )
}
