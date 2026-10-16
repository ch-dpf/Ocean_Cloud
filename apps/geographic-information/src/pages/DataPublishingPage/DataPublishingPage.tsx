import { useState } from 'react'
import { ConfirmDialog, SubNav } from '@ocean-cloud/ui'
import styles from './DataPublishingPage.module.css'
import { DATA_PUBLISHING_SECTIONS } from '../../config/navigation'
import { PublicationDetailDialog } from '../../features/dataPublishing/components/PublicationDetailDialog/PublicationDetailDialog'
import { PublicationTable } from '../../features/dataPublishing/components/PublicationTable/PublicationTable'
import {
  PUBLICATION_PAGE_SIZE,
  PUBLICATION_STATUS,
} from '../../features/dataPublishing/constants/publication'
import { usePublicationPage } from '../../features/dataPublishing/hooks/usePublicationPage'
import { disablePublication } from '../../features/dataPublishing/services/publicationService'
import type {
  PublicationProcessingType,
  PublicationRow,
  PublicationScope,
} from '../../features/dataPublishing/types/publication'

interface DataPublishingPageProps {
  readonly activePath: string
}

/** 地形服务路由 */
const TERRAIN_PATH = '/data-publishing/terrain'
/** 影像服务路由 */
const IMAGERY_PATH = '/data-publishing/imagery'

/** 由二级路由解析查看范围：地形 / 影像，其余（全部服务及未接入类型）合并展示 */
function resolveScope(path: string): PublicationScope {
  if (path === TERRAIN_PATH) return 'terrain'
  if (path === IMAGERY_PATH) return 'imagery'
  return 'all'
}

export function DataPublishingPage({ activePath }: DataPublishingPageProps) {
  const section =
    DATA_PUBLISHING_SECTIONS.find((item) => item.path === activePath) ??
    DATA_PUBLISHING_SECTIONS[0]
  const scope = resolveScope(activePath)
  // 默认只查已发布的服务；清空状态时查询全部
  const [status, setStatus] = useState<string>(PUBLICATION_STATUS.published)
  // 服务编号在点击「搜索」时才生效，避免输入过程中逐字请求
  const [serviceCode, setServiceCode] = useState('')
  const [pageSize, setPageSize] = useState(PUBLICATION_PAGE_SIZE)
  // 待停用的记录；非空时弹出二次确认
  const [disablingRow, setDisablingRow] = useState<PublicationRow | null>(null)
  // 待查看详情的记录；非空时弹出详情弹窗
  const [viewingRow, setViewingRow] = useState<PublicationRow | null>(null)

  const { records, total, current, isLoading, error, goToPage, refresh } =
    usePublicationPage({ scope, status, serviceCode, size: pageSize })

  /** 每页条数变化时由 hook 回到第 1 页 */
  function handlePageChange(page: number, size: number) {
    setPageSize(size)
    goToPage(page)
  }

  /** 状态下拉即时联动；服务编号仅同步显示，真正筛选以点击搜索为准 */
  function handleValuesChange(values: Record<string, unknown>) {
    const next = values.status
    setStatus(typeof next === 'string' ? next : '')
  }

  /** 点击搜索：服务编号在此刻提交，同时校准一次状态 */
  function handleSearch(values: Record<string, unknown>) {
    const nextStatus = values.status
    setStatus(typeof nextStatus === 'string' ? nextStatus : '')
    const nextCode = values.serviceCode
    setServiceCode(typeof nextCode === 'string' ? nextCode.trim() : '')
    refresh()
  }

  function handleReset() {
    setStatus(PUBLICATION_STATUS.published)
    setServiceCode('')
    refresh()
  }

  /** 停用服务；失败时由 ConfirmDialog 保留弹窗并交给统一错误提示。 */
  async function handleDisableConfirm() {
    if (disablingRow === null) return
    const { kind, serviceCode: code } = disablingRow
    const processingType = kind.toUpperCase() as
      'TERRAIN' | 'IMAGERY' | 'VECTOR'
    await disablePublication(processingType, code)
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
        <PublicationTable
          scope={scope}
          records={records}
          isLoading={isLoading}
          error={error}
          current={current}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          onValuesChange={handleValuesChange}
          onSearch={handleSearch}
          onReset={handleReset}
          onView={setViewingRow}
          onDisable={setDisablingRow}
        />
      </div>
      {viewingRow !== null && (
        <PublicationDetailDialog
          processingType={
            viewingRow.kind.toUpperCase() as PublicationProcessingType
          }
          serviceCode={viewingRow.serviceCode}
          onClose={() => setViewingRow(null)}
        />
      )}
      {disablingRow !== null && (
        <ConfirmDialog
          title="停用服务"
          message={`确定停用服务「${disablingRow.serviceCode}」吗？停用后该服务将不再对外提供。`}
          confirmLabel="停用"
          onConfirm={handleDisableConfirm}
          onClose={() => setDisablingRow(null)}
        />
      )}
    </section>
  )
}
