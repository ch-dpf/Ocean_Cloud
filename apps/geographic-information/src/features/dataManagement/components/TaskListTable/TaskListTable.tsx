import { Select, Form, Input } from 'antd'
import type { FormInstance, TableColumnsType } from 'antd'
import styles from './TaskListTable.module.css'
import { SearchTable } from '@ocean-cloud/ui'
import {
  PROCESSING_TYPE_IMAGERY,
  PROCESSING_TYPE_TERRAIN,
  TASK_STATUS_LABELS,
  toProcessingTypeLabel,
  toTaskStatusLabel,
} from '../../constants/task'
import type { TaskRecord } from '../../types/task'

interface TaskListTableProps {
  readonly records: readonly TaskRecord[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly pageSize: number
  readonly total: number
  /** 页码或每页条数变化 */
  readonly onPageChange: (page: number, pageSize: number) => void
  /** 外部表单实例，页签切换时回写「任务状态」 */
  readonly searchForm?: FormInstance
  readonly onValuesChange?: (values: Record<string, unknown>) => void
  /** 点击搜索 */
  readonly onSearch: () => void
  /** 点击重置（表单已重置后触发） */
  readonly onReset: () => void
  /** 点击「发布」；不传时按钮仅作为占位展示 */
  readonly onPublish?: (record: TaskRecord) => void
  /** 点击「查看」打开任务详情；不传时按钮仅作为占位展示 */
  readonly onView?: (record: TaskRecord) => void
  /** 正在发布的任务 id：该行按钮显示「发布中…」 */
  readonly publishingId?: string | null
}

/** 状态小方块的颜色；未命中的取值用兜底色 */
const STATUS_COLORS: Readonly<Record<string, string>> = {
  QUEUED: '#8394a0',
  RUNNING: '#1267d6',
  COMPLETED: '#2fa84f',
  PARTIAL_FAILED: '#e08c1a',
  FAILED: '#d64545',
}

const STATUS_FALLBACK_COLOR = '#8394a0'

/** 后端返回形如 2026-09-14T17:04:57.043286，展示为 2026-09-14 17:04:57 */
function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/**
 * 任务名称形如「地形目录处理：gDEM_N」：冒号前为任务名称，冒号后为输入数据。
 * 没有冒号时整串作为任务名称，输入数据展示 —。
 */
function splitTaskName(taskName: string): {
  readonly name: string
} {
  const index = taskName.search(/[:：]/)
  if (index < 0) return { name: taskName }
  return {
    name: taskName.slice(0, index),
  }
}

/** 开始到结束的耗时；任务未结束时展示 — */
function formatDuration(start: string | null, finish: string | null): string {
  if (!start || !finish) return '—'
  const seconds = Math.round(
    (new Date(finish).getTime() - new Date(start).getTime()) / 1000,
  )
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分 ${seconds % 60} 秒`
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`
}

/** 列定义；序号与操作列按钮依赖外部传入的值，因此每次渲染重建 */
function buildColumns(
  current: number,
  pageSize: number,
  onView: ((record: TaskRecord) => void) | undefined,
  onPublish: ((record: TaskRecord) => void) | undefined,
  publishingId: string | null | undefined,
): TableColumnsType<TaskRecord> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    {
      title: '任务名称',
      key: 'taskName',
      ellipsis: true,
      render: (_, record) => {
        const { name } = splitTaskName(record.taskName)
        return <span title={record.taskName}>{name}</span>
      },
    },
    {
      title: '数据接入方式',
      key: 'input',
      ellipsis: true,
      render: (_, record) => {
        const inputType = record.sourceType || ''
        return <span title={inputType}>{inputType}</span>
      },
    },
    {
      title: '处理类型',
      key: 'processingType',
      render: (_, record) => toProcessingTypeLabel(record.processingType ?? ''),
    },
    {
      title: '进度',
      key: 'progress',
      width: 110,
      render: (_, record) => `${record.completedCount} / ${record.totalCount}`,
    },
    {
      title: '耗时',
      key: 'duration',
      width: 130,
      render: (_, record) =>
        formatDuration(record.startTime, record.finishTime),
    },
    {
      title: '创建时间',
      key: 'createTime',
      width: 170,
      render: (_, record) => formatTime(record.createTime),
    },
    {
      title: '状态',
      key: 'taskStatus',
      width: 130,
      render: (_, record) => (
        <span className={styles.status}>
          <span
            className={styles.statusSquare}
            style={{
              background:
                STATUS_COLORS[record.taskStatus] ?? STATUS_FALLBACK_COLOR,
            }}
            aria-hidden="true"
          />
          {toTaskStatusLabel(record.taskStatus)}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 190,
      // 横向滚动时固定在表格右侧，按钮始终可见
      fixed: 'right',
      render: (_, record) => {
        const isPublishing = publishingId === record.id
        return (
          <span className={styles.actionCell}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={onView === undefined ? undefined : () => onView(record)}
              disabled={onView === undefined}
            >
              查看
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={
                onPublish === undefined ? undefined : () => onPublish(record)
              }
              // 只开放已完成的地形/影像任务发布，其余状态与类型置灰
              disabled={
                record.taskStatus !== 'COMPLETED' ||
                isPublishing ||
                (record.processingType !== PROCESSING_TYPE_TERRAIN &&
                  record.processingType !== PROCESSING_TYPE_IMAGERY)
              }
            >
              {isPublishing ? '发布中…' : '发布'}
            </button>
          </span>
        )
      },
    },
  ]
}

export function TaskListTable({
  records,
  isLoading,
  error,
  current,
  pageSize,
  total,
  onPageChange,
  searchForm,
  onValuesChange,
  onSearch,
  onReset,
  onView,
  onPublish,
  publishingId,
}: TaskListTableProps) {
  return (
    <SearchTable<TaskRecord>
      columns={buildColumns(current, pageSize, onView, onPublish, publishingId)}
      dataSource={records}
      rowKey="id"
      loading={isLoading}
      total={total}
      current={current}
      pageSize={pageSize}
      onPageChange={onPageChange}
      searchForm={searchForm}
      onValuesChange={onValuesChange}
      onSearch={onSearch}
      onReset={onReset}
      emptyText={error ?? undefined}
      searchFormItems={
        <>
          <Form.Item label="任务名称" name="taskName">
            <Input placeholder="请输入任务名称" allowClear />
          </Form.Item>
          <Form.Item label="任务状态" name="taskStatus">
            <Select
              placeholder="全部状态"
              allowClear
              style={{ width: 140 }}
              options={Object.entries(TASK_STATUS_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Form.Item>
        </>
      }
    />
  )
}
