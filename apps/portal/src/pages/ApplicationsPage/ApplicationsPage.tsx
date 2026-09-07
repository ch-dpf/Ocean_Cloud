import { PageHeader } from '@ocean-cloud/ui'
import { ApplicationCatalog } from '../../features/applications/components/ApplicationCatalog/ApplicationCatalog'
export function ApplicationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="APPLICATIONS"
        title="应用中心"
        description="连接你的业务应用，构建统一工作空间。"
        actions={<a href="#/application-management">管理应用 →</a>}
      />
      <ApplicationCatalog />
    </>
  )
}
