import { useEffect, useState } from 'react'
import { AppDialog, cellText, copyText, formatTime } from '@ocean-cloud/ui'
import styles from './PublicationDetailDialog.module.css'
import {
  toPublicationKindLabel,
  toPublicationStatusLabel,
} from '../../constants/publication'
import { getPublicationDetail } from '../../services/publicationService'
import type {
  Publication,
  PublicationProcessingType,
} from '../../types/publication'

interface PublicationDetailDialogProps {
  readonly processingType: PublicationProcessingType
  readonly serviceCode: string
  readonly onClose: () => void
}

interface SummaryField {
  readonly label: string
  readonly value: string
  /** 链接类字段：点击整格即复制，复制后末尾闪现小签 */
  readonly copyable?: boolean
}

/** 复制结果的提示停留时长（毫秒），与服务列表的复制提示保持一致 */
const COPY_HINT_MS = 1600

/** 复制结果：哪个字段、成功与否 */
interface CopyHint {
  readonly label: string
  readonly ok: boolean
}

/** 层级区间：minZoom ~ maxZoom，任一缺失都展示 — */
function formatZoomRange(record: Publication): string {
  if (record.minZoom === null || record.maxZoom === null) return '—'
  return `${record.minZoom} ~ ${record.maxZoom}`
}

/** 概览字段：与详情接口返回的字段一一对应，三个地址类字段可点击复制 */
function buildSummaryFields(record: Publication): readonly SummaryField[] {
  return [
    { label: '服务编号', value: record.serviceCode },
    { label: '服务状态', value: toPublicationStatusLabel(record.status) },
    {
      label: '服务类型',
      value: toPublicationKindLabel(record.processingType.toLowerCase()),
    },
    { label: '服务地址', value: cellText(record.serviceUrl), copyable: true },
    {
      label: '描述文件',
      value: cellText(record.descriptorUrl),
      copyable: true,
    },
    {
      label: '瓦片模板',
      value: cellText(record.tileUrlTemplate),
      copyable: true,
    },
    { label: '目标坐标系', value: cellText(record.targetCrs) },
    { label: '瓦片编号方案', value: cellText(record.tileProfile) },
    { label: '输出格式', value: cellText(record.outputFormat) },
    { label: '层级', value: formatZoomRange(record) },
    { label: '产物路径', value: cellText(record.outputKey) },
    { label: '瓦片集 id', value: record.tileSetId },
    { label: '源任务', value: record.sourceTaskId },
    { label: '关联数据集', value: cellText(record.dataSetId) },
    { label: '发布时间', value: formatTime(record.publishTime) },
    { label: '更新时间', value: formatTime(record.updateTime) },
  ]
}

/** 发布服务详情：字段与详情接口一致，链接类字段点击即复制 */
export function PublicationDetailDialog({
  processingType,
  serviceCode,
  onClose,
}: PublicationDetailDialogProps) {
  const [detail, setDetail] = useState<Publication | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 复制结果的短暂提示；到点后自动清空
  const [copyHint, setCopyHint] = useState<CopyHint | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getPublicationDetail(processingType, serviceCode, controller.signal)
      .then((record) => {
        setDetail(record)
        setIsLoading(false)
      })
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
        if (controller.signal.aborted) return
        setIsLoading(false)
        setError('详情加载失败。')
      })
    return () => controller.abort()
  }, [processingType, serviceCode])

  /** 点击链接类字段：复制后在该字段末尾闪现结果小签 */
  async function handleCopy(field: SummaryField) {
    const hint: CopyHint = {
      label: field.label,
      ok: await copyText(field.value),
    }
    setCopyHint(hint)
    window.setTimeout(() => {
      // 只清掉这次设置的那条：期间又复制过别的字段时，不提前清掉新的提示
      setCopyHint((previous) => (previous === hint ? null : previous))
    }, COPY_HINT_MS)
  }

  return (
    <AppDialog
      title="服务详情"
      eyebrow={serviceCode}
      onClose={onClose}
      closeOutside
      className={styles.dialog}
    >
      <div className={styles.body}>
        {isLoading ? (
          <p className={styles.state} role="status">
            正在加载详情…
          </p>
        ) : error !== null || detail === null ? (
          <p className={styles.state}>{error ?? '详情加载失败。'}</p>
        ) : (
          <dl className={styles.summary}>
            {buildSummaryFields(detail).map((field) => {
              const hint =
                copyHint !== null && copyHint.label === field.label
                  ? copyHint
                  : null
              return (
                <div className={styles.summaryItem} key={field.label}>
                  <dt>{field.label}</dt>
                  <dd title={field.value}>
                    {field.copyable === true ? (
                      // 整格可点复制：地址照常展示并保持省略号，结果小签跟在后面
                      <button
                        type="button"
                        className={styles.copyButton}
                        onClick={() => void handleCopy(field)}
                        aria-label={`复制${field.label}`}
                      >
                        <span className={styles.copyText}>{field.value}</span>
                        {hint !== null && (
                          <span
                            className={
                              hint.ok ? styles.copyTag : styles.copyFailTag
                            }
                            role="status"
                          >
                            {hint.ok ? '已复制' : '复制失败'}
                          </span>
                        )}
                      </button>
                    ) : (
                      field.value
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        )}
      </div>
    </AppDialog>
  )
}
