import { useEffect, useState } from 'react'
import { Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { AppDialog, formatFileSize, formatTime } from '@ocean-cloud/ui'
import styles from './TransferDetailDialog.module.css'
import {
  toOperationTypeLabel,
  toTaskStatusLabel,
  toImportStageLabel,
} from '../../constants/task'
import { getTransferDetail } from '../../services/fileTransferService'
import type { TransferFile, TransferRecord } from '../../types/fileTransfer'

interface TransferDetailDialogProps {
  readonly recordNo: string
  readonly onClose: () => void
}

const FILE_COLUMNS: TableColumnsType<TransferFile> = [
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
  {
    title: '操作状态',
    key: 'operationStatus',
    width: 150,
    render: (_, record) =>
      ({
        SUCCESS: '成功',
        FAILED: '失败',
        PENDING: '等待中',
        RUNNING:
          record.uploadStatus === 'READY' ? '空间信息提取中' : '文件传输中',
      })[record.operationStatus] ?? record.operationStatus,
  },
  { title: '失败原因', dataIndex: 'errorMessage', width: 260, ellipsis: true },
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
function buildSummaryFields(record: TransferRecord): readonly {
  readonly label: string
  readonly value: string
}[] {
  return [
    { label: '记录编号', value: record.recordNo },
    { label: '传输类型', value: toOperationTypeLabel(record.operationType) },
    { label: '数据集', value: record.dataSetName ?? record.dataSetId },
    { label: '记录状态', value: toTaskStatusLabel(record.recordStatus) },
    { label: '当前阶段', value: toImportStageLabel(record.currentStage) },
    {
      label: '进度',
      value:
        record.recordStatus === 'RUNNING' &&
        record.currentStage === 'EXTRACTING_METADATA'
          ? '正在提取空间信息'
          : `${record.progress}%`,
    },
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

/** 传输记录详情：上半部分是记录级概览，下半部分是该记录下的文件列表 */
export function TransferDetailDialog({
  recordNo,
  onClose,
}: TransferDetailDialogProps) {
  const [detail, setDetail] = useState<TransferRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function load() {
      try {
        const record = await getTransferDetail(recordNo, controller.signal)
        if (controller.signal.aborted) return
        setDetail(record)
        setIsLoading(false)
        setError(null)
        if (
          record.recordStatus === 'RUNNING' ||
          record.recordStatus === 'QUEUED'
        )
          timer = setTimeout(() => void load(), 2500)
      } catch {
        if (controller.signal.aborted) return
        setIsLoading(false)
        setError('详情加载失败。')
      }
    }
    void load()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [recordNo])

  const files = detail?.files ?? []

  return (
    <AppDialog
      title="传输记录详情"
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

            <p className={styles.sectionTitle}>文件列表（{files.length}）</p>
            <Table<TransferFile>
              rowKey="recordItemId"
              columns={FILE_COLUMNS}
              dataSource={[...files]}
              size="small"
              pagination={false}
              scroll={{ x: 1280 }}
              locale={{ emptyText: '该记录下暂无文件' }}
            />
          </>
        )}
      </div>
    </AppDialog>
  )
}
