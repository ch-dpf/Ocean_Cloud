import { useEffect, useId, useRef, useState } from 'react'
import { Table } from 'antd'
import type { TableColumnsType } from 'antd'
import styles from './FileOptDetailDialog.module.css'
import { toOperationTypeLabel, toTaskStatusLabel } from '../../constants/task'
import { getFileOptDetail } from '../../services/fileOptService'
import type { FileOptFile, FileOptRecord } from '../../types/fileOpt'

interface FileOptDetailDialogProps {
  readonly recordNo: string
  readonly onClose: () => void
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** 后端返回字节数字符串，展示为带单位的可读大小 */
function formatFileSize(sizeBytes: string): string {
  const bytes = Number(sizeBytes)
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 ? String(value) : value.toFixed(1)} ${SIZE_UNITS[unit]}`
}

/** 后端返回形如 2026-09-20T11:20:18.633696，展示为 2026-09-20 11:20:18 */
function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

const FILE_COLUMNS: TableColumnsType<FileOptFile> = [
  {
    title: '序号',
    key: 'index',
    width: 60,
    render: (_, __, index) => index + 1,
  },
  { title: '文件名', dataIndex: 'originalName', width: 220, ellipsis: true },
  { title: '格式', dataIndex: 'extension', width: 80 },
  {
    title: '大小',
    key: 'sizeBytes',
    width: 100,
    render: (_, record) => formatFileSize(record.sizeBytes),
  },
  { title: '上传状态', dataIndex: 'uploadStatus', width: 110 },
  { title: 'SHA256', dataIndex: 'sha256', width: 240, ellipsis: true },
  { title: '存储路径', dataIndex: 'storageKey', width: 300, ellipsis: true },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170,
    render: (_, record) => formatTime(record.createTime),
  },
]

/** 概览字段：与详情接口返回的记录级字段一一对应 */
function buildSummaryFields(record: FileOptRecord): readonly {
  readonly label: string
  readonly value: string
}[] {
  return [
    { label: '记录编号', value: record.recordNo },
    { label: '操作类型', value: toOperationTypeLabel(record.operationType) },
    { label: '数据集', value: record.dataSetName ?? record.dataSetId },
    { label: '记录状态', value: toTaskStatusLabel(record.recordStatus) },
    { label: '当前阶段', value: toTaskStatusLabel(record.currentStage) },
    { label: '进度', value: `${record.progress}%` },
    {
      label: '已完成 / 总数',
      value: `${record.completedCount} / ${record.totalCount}`,
    },
    { label: '失败数', value: String(record.failedCount) },
    { label: '开始时间', value: formatTime(record.startTime) },
    { label: '结束时间', value: formatTime(record.finishTime) },
    { label: '创建时间', value: formatTime(record.createTime) },
    { label: '更新时间', value: formatTime(record.updateTime) },
  ]
}

/** 导入记录详情：上半部分是记录级概览，下半部分是该记录下的文件列表 */
export function FileOptDetailDialog({
  recordNo,
  onClose,
}: FileOptDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [detail, setDetail] = useState<FileOptRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getFileOptDetail(recordNo, controller.signal)
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
  }, [recordNo])

  const files = detail?.files ?? []

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={() => onClose()}
    >
      <div className={styles.heading}>
        <h2 className={styles.title} id={titleId}>
          导入记录详情
        </h2>
        <button
          type="button"
          className={styles.close}
          onClick={() => onClose()}
          aria-label="关闭详情"
        >
          ×
        </button>
      </div>

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
            <p className={styles.errorText}>错误信息：{detail.errorMessage}</p>
          )}

          <p className={styles.sectionTitle}>文件列表（{files.length}）</p>
          <Table<FileOptFile>
            rowKey="id"
            columns={FILE_COLUMNS}
            dataSource={[...files]}
            size="small"
            pagination={false}
            scroll={{ x: 1280 }}
            locale={{ emptyText: '该记录下暂无文件' }}
          />
        </>
      )}
    </dialog>
  )
}
