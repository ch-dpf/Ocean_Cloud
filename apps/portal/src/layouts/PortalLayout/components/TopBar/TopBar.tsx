import styles from './TopBar.module.css'
interface TopBarProps {
  readonly pageTitle: string
}
export function TopBar({ pageTitle }: TopBarProps) {
  return (
    <header className={styles.header}>
      <div className={styles.breadcrumb}>
        工作空间 <span>/</span> <b>{pageTitle}</b>
      </div>
      <div className={styles.headerRight}>
        <span className={styles.avatar}>云</span>
        <div className={styles.workspaceInfo}>
          云海平台<small>默认工作空间</small>
        </div>
      </div>
    </header>
  )
}
