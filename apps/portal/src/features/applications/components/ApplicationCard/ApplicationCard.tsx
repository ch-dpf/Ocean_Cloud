import styles from './ApplicationCard.module.css'
import type { ApplicationCatalogItem } from '../../../../types/application'
interface ApplicationCardProps {
  readonly application: ApplicationCatalogItem
}
export function ApplicationCard({ application }: ApplicationCardProps) {
  const content = (
    <>
      <div className={styles.cardTop}>
        <div className={styles.appIcon}>{application.icon}</div>
        <span
          className={
            application.status === 'available'
              ? styles.badge
              : styles.mutedBadge
          }
        >
          {application.status === 'available' ? '已接入' : '规划中'}
        </span>
      </div>
      <h3>{application.name}</h3>
      <p>{application.description}</p>
      <div className={styles.cardFooter}>
        <span>{application.category}</span>
        {application.status === 'available' ? (
          <b>打开应用 ↗</b>
        ) : (
          <span>待接入</span>
        )}
      </div>
    </>
  )
  return application.status === 'available' ? (
    <a
      className={styles.appCard}
      href={application.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${application.name}（在新标签页打开）`}
    >
      {content}
    </a>
  ) : (
    <article className={[styles.appCard, styles.upcoming].join(' ')}>
      {content}
    </article>
  )
}
