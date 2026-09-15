import { useState } from 'react'
import { SubNav } from '@ocean-cloud/ui'
import styles from './DataPublishingPage.module.css'
import { DATA_PUBLISHING_SECTIONS } from '../../config/navigation'
import { PublicationTable } from '../../features/dataPublishing/components/PublicationTable/PublicationTable'
import {
  PUBLICATION_PAGE_SIZE,
  PUBLICATION_STATUS,
} from '../../features/dataPublishing/constants/publication'
import { usePublicationPage } from '../../features/dataPublishing/hooks/usePublicationPage'

interface DataPublishingPageProps {
  readonly activePath: string
}

export function DataPublishingPage({ activePath }: DataPublishingPageProps) {
  const section =
    DATA_PUBLISHING_SECTIONS.find((item) => item.path === activePath) ??
    DATA_PUBLISHING_SECTIONS[0]
  // 默认只查已发布的服务；清空状态时查询全部
  const [status, setStatus] = useState<string>(PUBLICATION_STATUS.published)
  const [pageSize, setPageSize] = useState(PUBLICATION_PAGE_SIZE)

  const { records, total, current, isLoading, error, goToPage, refresh } =
    usePublicationPage({ status, size: pageSize })

  /** 每页条数变化时由 hook 回到第 1 页 */
  function handlePageChange(page: number, size: number) {
    setPageSize(size)
    goToPage(page)
  }

  function handleValuesChange(values: Record<string, unknown>) {
    const next = values.status
    setStatus(typeof next === 'string' ? next : '')
  }

  function handleReset() {
    setStatus(PUBLICATION_STATUS.published)
    refresh()
  }

  return (
    <section className={styles.page}>
      <SubNav
        items={DATA_PUBLISHING_SECTIONS}
        activePath={section.path}
        title={section.label}
        subtitle="按服务类型筛选"
      />
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <div className={styles.contentTitle}>
            <h2>全部服务</h2>
            <p>
              {section.pending === true
                ? `${section.label}接口待接入，暂展示全部服务`
                : '已发布的地形服务，可直接在 Cesium 中作为地形服务加载'}
            </p>
          </div>
        </div>

        <PublicationTable
          records={records}
          isLoading={isLoading}
          error={error}
          current={current}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          onValuesChange={handleValuesChange}
          onSearch={() => refresh()}
          onReset={handleReset}
        />
      </div>
    </section>
  )
}
