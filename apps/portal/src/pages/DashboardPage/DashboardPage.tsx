import { ResourceSummary } from '../../features/dashboard/components/ResourceSummary/ResourceSummary'
import { WorkspacePanels } from '../../features/dashboard/components/WorkspacePanels/WorkspacePanels'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  return (
    <div className={styles.dashboardPage}>
      <header className={styles.pageHeader}>
        <div>
          <h1>工作台</h1>
          <p>系统资源、运行任务与服务调用情况</p>
        </div>
        <span className={styles.dataStatus}>
          <span aria-hidden="true" />
          实时数据 (WebSocket)
        </span>
      </header>

      <ResourceSummary />
      <WorkspacePanels />
    </div>
  )
}
