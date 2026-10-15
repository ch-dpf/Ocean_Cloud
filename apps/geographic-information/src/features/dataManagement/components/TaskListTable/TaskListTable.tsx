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
  /** 点击「归档」发起静态瓦片集归档；不传时按钮仅作为占位展示 */
  readonly onArchive?: (record: TaskRecord) => void
  /** 点击「查看」打开任务详情；不传时按钮仅作为占位展示 */
  readonly onView?: (record: TaskRecord) => void
  /** 正在发布的任务 id：该行按钮显示「发布中…」 */
  readonly publishingId?: string | null
  /** 正在归档的任务 id：该行按钮显示「归档中…」 */
  readonly archivingId?: string | null
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
  onArchive: ((record: TaskRecord) => void) | undefined,
  publishingId: string | null | undefined,
  archivingId: string | null | undefined,
): TableColumnsType<TaskRow> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    {
      title: '任务编号',
      key: 'no',
      width: 180,
      render: (_, record) => record.taskNo,
    },
    {
      title: '任务名称',
      key: 'taskName',
      // 定宽 200px，超长由单元格内部自己打省略号；
      // 不开启列上的 ellipsis：它会给单元格加 overflow: hidden，把悬浮小签一起裁掉
      width: 200,
      render: (_, record) => (
        <span className={styles.nameCell}>
          <span className={styles.nameText}>{record.taskName}</span>
          {/* 悬浮小签展示完整任务名；小签是单元格的子元素，鼠标移上去不会中断 hover */}
          <span className={styles.nameTip} role="tooltip">
            {record.taskName}
          </span>
        </span>
      ),
    },
    {
      title: '数据接入方式',
      key: 'input',
      // 定宽不只是为了排版：本表所有列都有数值宽度后，SearchTable 才会把
      // scroll.x 算成数字，rc-table 才会用 table-layout: fixed，ellipsis 才生效
      width: 130,
      ellipsis: true,
      render: (_, record) => {
        const inputType = record.sourceTypeName ?? record.sourceType ?? ''
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
      // 三个按钮（查看 / 发布 / 归档），宽度要够均分
      width: 170,
      // 横向滚动时固定在表格右侧，按钮始终可见
      fixed: 'right',
      render: (_, record) => {
        const isPublishing = publishingId === record.id
        const isArchiving = archivingId === record.id
        // 发布与归档都只对已完成的地形/影像任务开放：没有瓦片集时两者都无处落
        const isProcessable =
          record.taskStatus === 'COMPLETED' &&
          (record.processingType === PROCESSING_TYPE_TERRAIN ||
            record.processingType === PROCESSING_TYPE_IMAGERY)
        // 已经归档过就不再重复归档：不管上次是成功、进行中还是失败，
        // 失败的归档去「数据处理成果导出」页点重试
        const hasArchive =
          record.archiveStatus !== null && record.archiveStatus !== ''
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
                key: 'archive',
                label: isArchiving ? '归档中…' : '归档',
                onClick:
                  onArchive === undefined ? undefined : () => onArchive(record),
                // 已经归档过的任务不再开放（重复提交只会被后端拒掉）
                disabled:
                  onArchive === undefined ||
                  !isProcessable ||
                  isArchiving ||
                  hasArchive,
              },
              {
                key: 'publish',
                label: isPublishing ? '发布中…' : '发布',
                onClick:
                  onPublish === undefined ? undefined : () => onPublish(record),
                disabled:
                  onPublish === undefined || !isProcessable || isPublishing,
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
  onArchive,
  publishingId,
  archivingId,
}: TaskListTableProps) {
  return (
    <SearchTable<TaskRow>
      columns={buildColumns(
        current,
        pageSize,
        onView,
        onPublish,
        onArchive,
        publishingId,
        archivingId,
      )}
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
