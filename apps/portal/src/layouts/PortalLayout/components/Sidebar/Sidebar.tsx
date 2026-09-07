import styles from './Sidebar.module.css'
import { NAVIGATION_ITEMS } from '../../../../config/navigation'
interface SidebarProps {
  readonly pathname: string
}
export function Sidebar({ pathname }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <a className={styles.brand} href="#/">
        <img src="/ocean-logo.png" alt="云海 Logo" />
        <div>
          云海平台<small>OCEAN CLOUD</small>
        </div>
      </a>
      <div className={styles.workspace}>
        <span>O</span>
        <div>
          默认工作空间<small>Ocean_Cloud Workspace</small>
        </div>
      </div>
      <div className={styles.navLabel}>工作空间</div>
      <nav className={styles.navigation}>
        {NAVIGATION_ITEMS.map((item) => (
          <a
            key={item.path}
            className={pathname === item.path ? styles.active : ''}
            aria-current={pathname === item.path ? 'page' : undefined}
            href={`#${item.path}`}
          >
            <span>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div className={styles.sidebarBottom}>
        <div className={styles.helpCard}>
          <span>连接海洋 · 创造价值</span>
          <p>你的海洋数字工作空间</p>
          <div className={styles.miniWave}>∿ ∿ ∿</div>
        </div>
        <a href="#/about">
          ⓘ <span>关于云海平台</span>
          <small>v0.1.0</small>
        </a>
      </div>
    </aside>
  )
}
