import styles from './ApplicationCard.module.css'
import type { ApplicationCatalogItem } from '../../../../types/application'
interface ApplicationCardProps {
  readonly application: ApplicationCatalogItem
}
export function ApplicationCard({ application }: ApplicationCardProps) {
  const canLaunch = application.enabled && application.status === 'published'
  const status = !application.enabled
    ? '已停用'
    : application.status === 'published'
      ? '已发布'
      : application.sourceReady
        ? '待发布'
        : '待生成'
  const content = (
    <>
      <div className={styles.cardTop}>
        <div className={styles.appIcon}>{application.icon}</div>
        <span className={canLaunch ? styles.badge : styles.mutedBadge}>
          {status}
        </span>
      </div>
      <h3>{application.name}</h3>
      <p>{application.description || '独立业务应用'}</p>
      <div className={styles.cardFooter}>
        <span>{application.route}</span>
        {canLaunch ? <b>进入应用 →</b> : <span>请在应用管理中处理</span>}
      </div>
    </>
  )
  return canLaunch ? (
    <a
      className={styles.appCard}
      href={'#' + application.route}
      aria-label={'进入' + application.name}
    >
      {content}
    </a>
  ) : (
    <article className={[styles.appCard, styles.upcoming].join(' ')}>
      {content}
    </article>
  )
}
