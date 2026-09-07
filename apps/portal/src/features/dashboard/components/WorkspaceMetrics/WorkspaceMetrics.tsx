import styles from './WorkspaceMetrics.module.css'
import { useApplications } from '../../../applications/hooks/useApplications'
export function WorkspaceMetrics() {
  const { applications, error } = useApplications()
  const count = (value: number) =>
    error ? '—' : String(value).padStart(2, '0')
  return (
    <div className={styles.metrics}>
      <article>
        <span>已登记应用</span>
        <strong>
          {count(applications.length)}
          <small>个</small>
        </strong>
        <p>由应用管理统一维护</p>
      </article>
      <article>
        <span>可用应用</span>
        <strong>
          {count(
            applications.filter(
              (app) => app.status === 'published' && app.enabled,
            ).length,
          )}
          <small>个</small>
        </strong>
        <p>已有发布版本且处于启用状态</p>
      </article>
      <article>
        <span>待发布应用</span>
        <strong>
          {count(applications.filter((app) => !app.activeReleaseId).length)}
          <small>个</small>
        </strong>
        <p>尚未完成首次发布</p>
      </article>
      <article>
        <span>工作空间</span>
        <strong className={styles.metricText}>默认工作空间</strong>
        <p>集中管理应用与业务入口</p>
      </article>
    </div>
  )
}
