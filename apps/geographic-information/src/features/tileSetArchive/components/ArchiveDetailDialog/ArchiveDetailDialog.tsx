import { useEffect, useState } from 'react'
import {
  AppDialog,
  cellText,
  formatFileSize,
  formatTime,
} from '@ocean-cloud/ui'
import styles from './ArchiveDetailDialog.module.css'
import { toProcessingTypeLabel } from '../../../dataManagement/constants/task'
import { toArchiveStatusLabel } from '../../constants/archive'
import { getArchiveDetail } from '../../services/archiveService'
import type { TileSetArchive } from '../../types/archive'

interface ArchiveDetailDialogProps {
  readonly archiveNo: string
  readonly onClose: () => void
}

/** 概览字段：与详情接口返回的字段一一对应 */
function buildSummaryFields(record: TileSetArchive): readonly {
  readonly label: string
  readonly value: string
}[] {
  return [
    { label: '归档编号', value: record.archiveNo },
    { label: '归档名称', value: record.archiveName },
    { label: '归档状态', value: toArchiveStatusLabel(record.archiveStatus) },
    { label: '当前阶段', value: toArchiveStatusLabel(record.currentStage) },
    { label: '归档格式', value: record.archiveFormat },
    { label: '进度', value: `${record.progress}%` },
    { label: '归档大小', value: formatFileSize(record.archiveSizeBytes) },
    {
      label: '已处理 / 总字节',
      value: `${record.processedBytes} / ${record.totalBytes}`,
    },
    {
      label: '已处理 / 总文件',
      value: `${record.processedFileCount} / ${record.totalFileCount}`,
    },
    { label: '下载次数', value: record.downloadCount },
    { label: '最近下载', value: formatTime(record.lastDownloadTime) },
    { label: '是否可下载', value: record.downloadAvailable ? '是' : '否' },
    { label: '任务名称', value: record.taskName },
    { label: '任务编号', value: record.taskNo },
    {
      label: '处理类型',
      value: toProcessingTypeLabel(record.processingType),
    },
    { label: '处理任务 id', value: record.processingTaskId },
    { label: '瓦片集 id', value: record.tileSetId },
    { label: '归档 SHA256', value: cellText(record.sha256) },
    { label: '创建时间', value: formatTime(record.createTime) },
    { label: '开始时间', value: formatTime(record.startTime) },
    { label: '结束时间', value: formatTime(record.finishTime) },
    { label: '更新时间', value: formatTime(record.updateTime) },
    { label: '版本', value: record.version },
  ]
}

/** 归档详情：字段与接口返回一致，错误信息单独放在明面 */
export function ArchiveDetailDialog({
  archiveNo,
  onClose,
}: ArchiveDetailDialogProps) {
  const [detail, setDetail] = useState<TileSetArchive | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getArchiveDetail(archiveNo, controller.signal)
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
  }, [archiveNo])

  return (
    <AppDialog
      title="归档详情"
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
          <>
            <dl className={styles.summary}>
              {buildSummaryFields(detail).map((field) => (
                <div className={styles.summaryItem} key={field.label}>
                  <dt>{field.label}</dt>
                  <dd title={field.value}>{field.value}</dd>
                </div>
              ))}
            </dl>
            {detail.errorMessage !== null && detail.errorMessage !== '' && (
              <p className={styles.errorText}>
                错误信息：{detail.errorMessage}
              </p>
            )}
          </>
        )}
      </div>
    </AppDialog>
  )
}
