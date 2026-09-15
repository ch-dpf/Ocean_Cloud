import type { TableColumnsType } from 'antd'
import styles from './TaskRecordTable.module.css'
import { SearchTable } from '@ocean-cloud/ui'
import { toTaskStatusLabel } from '../../constants/task'
import type { TaskRecord } from '../../types/task'

interface TaskRecordTableProps {
  readonly records: readonly TaskRecord[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly pageSize: number
  readonly total: number
  /** 页码或每页条数变化 */
  readonly onPageChange: (page: number, pageSize: number) => void
}

/** 后端返回形如 2026-09-14T17:04:57.043286，展示为 2026-09-14 17:04:57 */
function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/** 列定义；序号需要按当前页换算，因此每次渲染重建 */
function buildColumns(
  current: number,
  pageSize: number,
): TableColumnsType<TaskRecord> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    { title: '任务名称', dataIndex: 'taskName', ellipsis: true },
    { title: '任务号', dataIndex: 'taskNo', ellipsis: true },
    {
      title: '状态',
      key: 'taskStatus',
      render: (_, record) => toTaskStatusLabel(record.taskStatus),
    },
    {
      title: '进度',
      key: 'progress',
      render: (_, record) => `${record.completedCount} / ${record.totalCount}`,
    },
    { title: '失败数', dataIndex: 'failedCount' },
    {
      title: '开始时间',
      key: 'startTime',
      render: (_, record) => formatTime(record.startTime),
    },
    {
      title: '结束时间',
      key: 'finishTime',
      render: (_, record) => formatTime(record.finishTime),
    },
    {
      title: '错误信息',
      key: 'errorMessage',
      ellipsis: true,
      render: (_, record) =>
        record.errorMessage ? (
          <span className={styles.errorText} title={record.errorMessage}>
            {record.errorMessage}
          </span>
        ) : (
          '—'
        ),
    },
  ]
}

export function TaskRecordTable({
  records,
  isLoading,
  error,
  current,
  pageSize,
  total,
  onPageChange,
}: TaskRecordTableProps) {
  return (
    <SearchTable<TaskRecord>
      columns={buildColumns(current, pageSize)}
      dataSource={records}
      rowKey="id"
      loading={isLoading}
      total={total}
      current={current}
      pageSize={pageSize}
      onPageChange={onPageChange}
      emptyText={error ?? undefined}
    />
  )
}
