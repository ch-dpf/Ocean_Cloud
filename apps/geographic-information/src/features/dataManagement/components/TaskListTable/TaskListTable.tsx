import { Select, Form, Input } from 'antd'
import type { FormInstance, TableColumnsType } from 'antd'
import styles from './TaskListTable.module.css'
import {
  PROGRESS_COLORS,
  STATUS_FALLBACK_COLOR,
  SearchTable,
  TableActions,
  formatDuration,
  formatTime,
} from '@ocean-cloud/ui'
import {
  PROCESSING_TYPE_IMAGERY,
  PROCESSING_TYPE_TERRAIN,
  TASK_STATUS_LABELS,
  toProcessingStageIndex,
  toProcessingStageLabel,
  toProcessingTypeLabel,
  toTaskStatusLabel,
} from '../../constants/task'
import type { TaskRecord } from '../../types/task'

/**
 * 表格行 = REST 任务记录 + 该任务最新的 WS 进度百分比。
 * 实时进度由页面按任务编号合并进来，表格自己不订阅长连接。
 */
export interface TaskRow extends TaskRecord {
  /** 进行中任务的实时百分比（0-100，处理任务是当前阶段的进度）；没有 WS 帧时为 null */
  readonly livePercent: number | null
  /** 进行中任务当前所处阶段（帧里 currentStage.code）；没有 WS 帧时为空串 */
  readonly liveStageCode: string
}

interface TaskListTableProps {
  readonly records: readonly TaskRow[]
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

/**
 * 没有实时帧时按 REST 状态上色（排队与处理中都算进行中）；
 * 有实时帧时改用帧里的结束标记与失败数判断，见 progressDisplay。
 * 颜色取自全局调色板，未识别的状态用兜底色。
 */
const PROGRESS_BAR_COLORS: Readonly<Record<string, string>> = {
  QUEUED: PROGRESS_COLORS.running,
  RUNNING: PROGRESS_COLORS.running,
  COMPLETED: PROGRESS_COLORS.done,
  PARTIAL_FAILED: PROGRESS_COLORS.failed,
  FAILED: PROGRESS_COLORS.failed,
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

/**
 * 进度列的展示值：颜色一律由 REST 的 taskStatus 决定（终态只有后端说了算），
 * 条上方那行文字承担阶段信息 —— 进行中显示「阶段名 序号 · 百分比」，
 * 终态整条填满表示已结束，其中已完成带 100%，失败类不再显示进度。
 */
function progressDisplay(row: TaskRow): {
  readonly percent: number
  readonly color: string
  readonly label: string
} {
  const color = PROGRESS_BAR_COLORS[row.taskStatus] ?? STATUS_FALLBACK_COLOR
  if (row.taskStatus === 'QUEUED' || row.taskStatus === 'RUNNING') {
    const percent = row.livePercent ?? 0
    // 阶段名与序号依赖帧里的 currentStage.code，拿不到时只剩状态名
    const stage = toProcessingStageLabel(row.liveStageCode)
    const index = toProcessingStageIndex(
      row.processingType ?? '',
      row.liveStageCode,
    )
    const name = index === '' ? stage : `${stage} ${index}`
    return { percent, color, label: `${name} · ${percent}%` }
  }
  const status = toTaskStatusLabel(row.taskStatus)
  return {
    percent: 100,
    color,
    label: row.taskStatus === 'COMPLETED' ? `${status} · 100%` : status,
  }
}

/** 列定义；序号与操作列按钮依赖外部传入的值，因此每次渲染重建 */
function buildColumns(
  current: number,
  pageSize: number,
  onView: ((record: TaskRecord) => void) | undefined,
  onPublish: ((record: TaskRecord) => void) | undefined,
  publishingId: string | null | undefined,
): TableColumnsType<TaskRow> {
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
      // 定宽后 ellipsis 才生效：手输的长任务名会截断，悬浮由 title 展示全量
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        const { name } = splitTaskName(record.taskName)
        return <span title={record.taskName}>{name}</span>
      },
    },
    {
      title: '数据接入方式',
      key: 'input',
      // 定宽不只是为了排版：本表所有列都有数值宽度后，SearchTable 才会把
      // scroll.x 算成数字，rc-table 才会用 table-layout: fixed，ellipsis 才生效
      width: 130,
      ellipsis: true,
      render: (_, record) => {
        const inputType =
          record.sourceTypeName ?? record.sourceType ?? ''
        return <span title={inputType}>{inputType}</span>
      },
    },
    {
      title: '处理类型',
      key: 'processingType',
      width: 120,
      render: (_, record) => toProcessingTypeLabel(record.processingType ?? ''),
    },
    {
      title: '进度',
      key: 'progress',
      // 加宽给满宽的条留空间，文字也移到了条上方
      width: 200,
      render: (_, record) => {
        const { percent, color, label } = progressDisplay(record)
        return (
          <span className={styles.progress}>
            <span className={styles.progressText}>{label}</span>
            <span className={styles.progressTrack}>
              <span
                className={styles.progressBar}
                style={{ width: `${percent}%`, background: color }}
              />
            </span>
          </span>
        )
      },
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
      title: '结束时间',
      key: 'finishTime',
      width: 170,
      render: (_, record) => formatTime(record.finishTime),
    },
    // 状态列（暂时注释掉）：要启用时请改用共享的 <StatusDot tone={...} label={...} />，
    // 本文件已不再有 STATUS_COLORS 与 styles.statusSquare
    // {
    //   title: '状态',
    //   key: 'taskStatus',
    //   width: 130,
    //   render: (_, record) => (
    //     <span className={styles.status}>
    //       <span
    //         className={styles.statusSquare}
    //         style={{
    //           background:
    //               STATUS_COLORS[record.taskStatus] ?? STATUS_FALLBACK_COLOR,
    //         }}
    //         aria-hidden="true"
    //       />
    //       {toTaskStatusLabel(record.taskStatus)}
    //     </span>
    //   ),
    // },
    {
      title: '操作',
      key: 'action',
      width: 100,
      // 横向滚动时固定在表格右侧，按钮始终可见
      fixed: 'right',
      render: (_, record) => {
        const isPublishing = publishingId === record.id
        return (
          <TableActions
            justify="evenly"
            actions={[
              {
                key: 'view',
                label: '查看',
                onClick:
                  onView === undefined ? undefined : () => onView(record),
                disabled: onView === undefined,
              },
              {
                key: 'publish',
                label: isPublishing ? '发布中…' : '发布',
                onClick:
                  onPublish === undefined ? undefined : () => onPublish(record),
                // 只开放已完成的地形/影像任务发布，其余状态与类型置灰
                disabled:
                  record.taskStatus !== 'COMPLETED' ||
                  isPublishing ||
                  (record.processingType !== PROCESSING_TYPE_TERRAIN &&
                    record.processingType !== PROCESSING_TYPE_IMAGERY),
              },
            ]}
          />
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
    <SearchTable<TaskRow>
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
