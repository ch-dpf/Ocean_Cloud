import styles from './Sidebar.module.css'
import { Brand } from '@ocean-cloud/ui'
import { NAVIGATION_ITEMS } from '../../../../config/navigation'
import { PORTAL_ORIGIN, MARINE_INFORMATION_ORIGIN } from '../../../../config/application'  
interface SidebarProps {
  readonly pathname: string
  readonly collapsed: boolean
  readonly onToggleCollapse: () => void
}
export function Sidebar({
  pathname,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={`${styles.sidebar}${collapsed ? ` ${styles.sidebarCollapsed}` : ''}`}
    >
      <Brand collapsed={collapsed} />
      <div className={styles.sidebarHome}>
        <a href={PORTAL_ORIGIN}><button className={styles.sidebarHomeButton}>
          <span style={{ fontFamily: 'Noto Sans SC', fontWeight: 700, fontStyle: 'Bold', fontSize: '17px', color: '#095ED4' }}>←</span>
          <span style={{ fontFamily: 'Noto Sans SC', fontWeight: 400, fontStyle: 'Regular', fontSize: '13px', color: '#095ED4' }}>&nbsp;&nbsp;&nbsp;返回平台首页</span>
        </button></a>
      </div>
      <div className={styles.sidebarGIStitle}>
        <div>
          <span style={{ fontFamily: 'Noto Sans SC', fontWeight: 700, fontStyle: 'Bold', fontSize: '16px', color: '#13293D' }}>GIS工作空间</span>
        </div>
        <div>
          <span style={{ fontFamily: 'Noto Sans SC', fontWeight: 400, fontStyle: 'Regular', fontSize: '11px', color: '#576E85' }}>地理信息数据</span>
        </div>
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
              <span className={styles.sidebarNavIcon}>{item.icon}</span>
              <span className={styles.sidebarNavText}>{item.label}</span>
            </a>
          )
        })}
      </nav>
      {/* 底部：收起侧边栏 */}
      <a href={MARINE_INFORMATION_ORIGIN}>
        <button>
          <span>切换至海洋模块</span>
        </button>
      </a>
      <button
        type="button"
        className={styles.sidebarCollapse}
        onClick={onToggleCollapse}
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        <span className={styles.sidebarCollapseIcon}>
          {collapsed ? '›' : '‹'}
        </span>
        <span className={styles.sidebarCollapseText}>收起侧边栏</span>
      </button>
    </aside>
  )
}
