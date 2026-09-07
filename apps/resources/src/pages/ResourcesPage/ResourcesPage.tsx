import styles from './ResourcesPage.module.css'
import { PageHeader } from '@ocean-cloud/ui'
import { ResourceFilters } from '../../features/resources/components/ResourceFilters/ResourceFilters'
import { ResourceTable } from '../../features/resources/components/ResourceTable/ResourceTable'
import { ResourceDetailsDialog } from '../../features/resources/components/ResourceDetailsDialog/ResourceDetailsDialog'
import { useResources } from '../../features/resources/hooks/useResources'
interface ResourcesPageProps {
  readonly isEmbedded: boolean
  readonly platformName: string
  readonly onNavigateHome: () => void
}
export function ResourcesPage({
  isEmbedded,
  platformName,
  onNavigateHome,
}: ResourcesPageProps) {
  const {
    query,
    kind,
    resources,
    selectedResource,
    isLoading,
    error,
    reload,
    setQuery,
    setKind,
    selectResource,
    clearSelection,
  } = useResources()
  return (
    <div className={styles.resourcePage}>
      <PageHeader
        eyebrow="RESOURCE CENTER"
        title="资源中心"
        description="管理海洋数据，连接每一次探索。"
        actions={
          isEmbedded && (
            <button type="button" onClick={onNavigateHome}>
              ← 返回工作台
            </button>
          )
        }
      />
      <div className={styles.notice}>
        示例工作空间 · 当前展示演示数据，未连接真实数据服务。
        <span>{platformName}</span>
      </div>
      <section className={styles.resourcePanel}>
        <ResourceFilters
          query={query}
          kind={kind}
          onQueryChange={setQuery}
          onKindChange={setKind}
        />
        <div aria-live="polite">
          {isLoading ? (
            <p>正在加载资源…</p>
          ) : error ? (
            <div>
              <p>{error}</p>
              <button type="button" onClick={reload}>
                重新加载
              </button>
            </div>
          ) : (
            <ResourceTable
              resources={resources}
              onSelectResource={selectResource}
            />
          )}
        </div>
      </section>
      <ResourceDetailsDialog
        resource={selectedResource}
        onClose={clearSelection}
      />
    </div>
  )
}
