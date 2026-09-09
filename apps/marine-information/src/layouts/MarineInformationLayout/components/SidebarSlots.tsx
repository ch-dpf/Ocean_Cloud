import styles from './SidebarSlots.module.css'
import {
  PORTAL_ORIGIN,
  GEOGRAPHIC_INFORMATION_ORIGIN,
} from '../../../config/application'

/** 头部插槽：返回平台首页 + 工作空间标题 */
export function SidebarHeaderSlot() {
  return (
    <>
      <div className={styles.home}>
        <a href={PORTAL_ORIGIN} className={styles.homeLink}>
          <span className={styles.homeArrow}>←</span>
          <span className={styles.homeText}>返回平台首页</span>
        </a>
      </div>
      <div className={styles.workspaceTitle}>
        <div className={styles.workspaceName}>海洋工作空间</div>
        <div className={styles.workspaceDesc}>海洋专业数据</div>
      </div>
    </>
  )
}

/** 底部插槽：切换业务模块 */
export function SidebarFooterSlot() {
  return (
    <div className={styles.switch}>
      <a href={GEOGRAPHIC_INFORMATION_ORIGIN} className={styles.switchLink}>
        <div className={styles.switchLabel}>切换业务模块</div>
        <div className={styles.switchTarget}>切换至GIS模块 →</div>
      </a>
    </div>
  )
}
