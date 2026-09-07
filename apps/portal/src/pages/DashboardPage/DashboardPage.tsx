import styles from './DashboardPage.module.css'
import { PageHeader } from '@ocean-cloud/ui'
import { OceanHero } from '../../features/dashboard/components/OceanHero/OceanHero'
import { WorkspaceMetrics } from '../../features/dashboard/components/WorkspaceMetrics/WorkspaceMetrics'
import { WorkspaceGuide } from '../../features/dashboard/components/WorkspaceGuide/WorkspaceGuide'
import { ApplicationCard } from '../../features/applications/components/ApplicationCard/ApplicationCard'
import { APPLICATION_CATALOG } from '../../config/applications'
export function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="YOUR OCEAN WORKSPACE"
        title="工作台"
        subtitle=" / Overview"
        description="从这里，开始连接海洋数据与应用。"
        actions={
          <span className={styles.environment}>
            <i /> 本地开发环境
          </span>
        }
      />
      <OceanHero />
      <WorkspaceMetrics />
      <div className={styles.sectionHeading}>
        <h2>
          应用空间 <span>Applications</span>
        </h2>
        <a href="#/applications">查看全部 ↗</a>
      </div>
      <div className={styles.appGrid}>
        {APPLICATION_CATALOG.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
      </div>
      <WorkspaceGuide />
    </>
  )
}
