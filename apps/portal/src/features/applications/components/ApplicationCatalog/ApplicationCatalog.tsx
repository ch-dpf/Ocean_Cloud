import { useApplications } from '../../hooks/useApplications'
import { ApplicationCard } from '../ApplicationCard/ApplicationCard'
import styles from './ApplicationCatalog.module.css'
export function ApplicationCatalog() {
  const { applications, isLoading, error, refresh } = useApplications()
  if (error)
    return (
      <div className={styles.state} role="alert">
        <p>{error}</p>
        <button onClick={() => void refresh()}>重新加载</button>
      </div>
    )
  if (isLoading && applications.length === 0)
    return <p role="status">正在加载应用…</p>
  const visible = applications.filter((app) => app.isListed)
  if (!visible.length)
    return (
      <div className={styles.state}>
        <p>暂无应用，前往应用管理创建。</p>
        <a href="#/application-management">应用管理 →</a>
      </div>
    )
  return (
    <div className={styles.grid}>
      {visible.map((application) => (
        <ApplicationCard key={application.id} application={application} />
      ))}
    </div>
  )
}
