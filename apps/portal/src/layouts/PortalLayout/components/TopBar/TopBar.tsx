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
        <span className={styles.devLabel}>DEVELOPMENT</span>
        <span className={styles.avatar}>云</span>
        <div className={styles.userInfo}>
          本地用户<small>开发工作空间</small>
        </div>
      </div>
    </header>
  )
}
