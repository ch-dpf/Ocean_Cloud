import styles from './ApplicationsPage.module.css'
import { PageHeader } from '@ocean-cloud/ui'
import { MICRO_APPLICATIONS } from '../../config/applications'
import { ApplicationCard } from '../../features/applications/components/ApplicationCard/ApplicationCard'
export function ApplicationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="APPLICATIONS"
        title="应用中心"
        description="连接你的业务应用，构建统一工作空间。"
      />
      <div className={styles.appGrid}>
        {MICRO_APPLICATIONS.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
      </div>
    </>
  )
}
