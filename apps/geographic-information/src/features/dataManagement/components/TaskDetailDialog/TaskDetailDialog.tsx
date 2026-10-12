import { useEffect, useState } from 'react'
import { Table } from 'antd'
import type { TableColumnsType } from 'antd'
import {
  AppDialog,
  cellText,
  formatFileSize,
  formatTime,
} from '@ocean-cloud/ui'
import styles from './TaskDetailDialog.module.css'
import {
  toInputKindLabel,
  toInputStatusLabel,
  toProcessingTypeLabel,
  toSourceTypeLabel,
  toTaskStatusLabel,
  toTileSetStatusLabel,
} from '../../constants/task'
import { getTaskDetail } from '../../services/taskService'
import type { TaskDetail, TaskInput, TaskTileSet } from '../../types/task'

interface TaskDetailDialogProps {
  readonly taskId: string
  readonly onClose: () => void
}

interface SummaryField {
  readonly label: string
  readonly value: string
}

/** 可空数字（int32 也可能以字符串返回） */
function numberText(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

/** 布尔展示为 是 / 否；null 为 — */
function boolText(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value ? '是' : '否'
}

/** 任务主体概览字段 */
function buildTaskFields(detail: TaskDetail): readonly SummaryField[] {
  const task = detail.task
  return [
    { label: '任务名称', value: task.taskName },
    { label: '任务编号', value: task.taskNo },
    {
      label: '处理类型',
      value: toProcessingTypeLabel(task.processingType ?? ''),
    },
    { label: '任务状态', value: toTaskStatusLabel(task.taskStatus) },
    {
      label: '当前阶段',
      value: task.currentStage ? toTaskStatusLabel(task.currentStage) : '—',
    },
    {
      label: '数据接入方式',
      value: task.sourceType ? toSourceTypeLabel(task.sourceType) : '—',
    },
    {
      label: '优先级',
      value: task.priority === null ? '—' : String(task.priority),
    },
    {
      label: '已完成 / 总数',
      value: `${task.completedCount} / ${task.totalCount}`,
    },
    { label: '失败数', value: String(task.failedCount) },
    { label: '开始时间', value: formatTime(task.startTime) },
    { label: '结束时间', value: formatTime(task.finishTime) },
    { label: '创建时间', value: formatTime(task.createTime) },
    { label: '更新时间', value: formatTime(task.updateTime) },
  ]
}

/** 处理参数字段；null 表示该类型未使用此参数，展示为 — */
function buildParameterFields(detail: TaskDetail): readonly SummaryField[] {
  const p = detail.parameters
  return [
    { label: '目标坐标系', value: cellText(p?.targetCrs) },
    { label: '瓦片切分剖面', value: cellText(p?.tileProfile) },
    { label: '输出格式', value: cellText(p?.outputFormat) },
    { label: '最小层级', value: numberText(p?.minZoom) },
    { label: '最大层级', value: numberText(p?.maxZoom) },
    { label: '重采样方式', value: cellText(p?.resampling) },
    { label: '是否透明', value: boolText(p?.transparent) },
    {
      label: '参数版本',
      value:
        detail.parameterSchemaVersion === null
          ? '—'
          : String(detail.parameterSchemaVersion),
    },
  ]
}

/** 瓦片集概览字段 */
function buildTileSetFields(tileSet: TaskTileSet): readonly SummaryField[] {
  return [
    { label: '瓦片类型', value: cellText(tileSet.tileType) },
    {
      label: '瓦片状态',
      value: tileSet.tileSetStatus
        ? toTileSetStatusLabel(tileSet.tileSetStatus)
        : '—',
    },
    { label: '目标坐标系', value: cellText(tileSet.targetCrs) },
    { label: '瓦片切分剖面', value: cellText(tileSet.tileProfile) },
    { label: '输出格式', value: cellText(tileSet.outputFormat) },
    {
      label: '层级范围',
      value: `${numberText(tileSet.minZoom)} ~ ${numberText(tileSet.maxZoom)}`,
    },
    { label: '产物路径', value: cellText(tileSet.outputKey) },
    { label: '清单路径', value: cellText(tileSet.manifestKey) },
    { label: '创建时间', value: formatTime(tileSet.createTime) },
    { label: '更新时间', value: formatTime(tileSet.updateTime) },
  ]
}

const INPUT_COLUMNS: TableColumnsType<TaskInput> = [
  {
    title: '序号',
    dataIndex: 'sequenceNo',
    width: 60,
  },
  {
    title: '文件名',
    key: 'originalName',
    width: 220,
    ellipsis: true,
    render: (_, record) => (
      <span title={record.errorMessage ?? undefined}>
        {cellText(record.originalName)}
      </span>
    ),
  },
  {
    title: '类型',
    key: 'inputKind',
    width: 80,
    render: (_, record) => toInputKindLabel(record.inputKind),
  },
  {
    title: '状态',
    key: 'inputStatus',
    width: 100,
    render: (_, record) => toInputStatusLabel(record.inputStatus),
  },
  { title: '格式', dataIndex: 'extension', width: 80, render: cellText },
  {
    title: '大小',
    key: 'sizeBytes',
    width: 100,
    render: (_, record) => formatFileSize(record.sizeBytes),
  },
  {
    title: 'SHA256',
    dataIndex: 'sha256',
    width: 240,
    ellipsis: true,
    render: cellText,
  },
  {
    title: '错误信息',
    dataIndex: 'errorMessage',
    width: 180,
    ellipsis: true,
    render: cellText,
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170,
    render: (_, record) => formatTime(record.createTime),
  },
]

/** 处理任务详情：任务概览 + 处理参数 + 输入文件 + 瓦片产物 */
export function TaskDetailDialog({ taskId, onClose }: TaskDetailDialogProps) {
  const [detail, setDetail] = useState<TaskDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getTaskDetail(taskId, controller.signal)
      .then((value) => {
        setDetail(value)
        setIsLoading(false)
      })
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
        if (controller.signal.aborted) return
        setIsLoading(false)
        setError('详情加载失败。')
      })
    return () => controller.abort()
  }, [taskId])

  const inputs = detail?.inputs ?? []
  const tileSet = detail?.tileSet ?? null

  return (
    <AppDialog
      title="处理任务详情"
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
            <p className={styles.sectionTitle}>任务概览</p>
            <dl className={styles.summary}>
              {buildTaskFields(detail).map((field) => (
                <div className={styles.summaryItem} key={field.label}>
                  <dt>{field.label}</dt>
                  <dd title={field.value}>{field.value}</dd>
                </div>
              ))}
            </dl>
            {detail.task.errorMessage !== null &&
              detail.task.errorMessage !== '' && (
                <p className={styles.errorText}>
                  错误信息：{detail.task.errorMessage}
                </p>
              )}
            {detail.requestFingerprint && (
              <dl className={styles.summary}>
                <div className={styles.summaryItem}>
                  <dt>请求指纹</dt>
                  <dd title={detail.requestFingerprint}>
                    {detail.requestFingerprint}
                  </dd>
                </div>
              </dl>
            )}

            <p className={styles.sectionTitle}>处理参数</p>
            <dl className={styles.summary}>
              {buildParameterFields(detail).map((field) => (
                <div className={styles.summaryItem} key={field.label}>
                  <dt>{field.label}</dt>
                  <dd title={field.value}>{field.value}</dd>
                </div>
              ))}
            </dl>

            <p className={styles.sectionTitle}>输入文件（{inputs.length}）</p>
            <Table<TaskInput>
              rowKey="id"
              columns={INPUT_COLUMNS}
              dataSource={[...inputs]}
              size="small"
              pagination={false}
              scroll={{ x: 1230 }}
              locale={{ emptyText: '该任务暂无输入文件' }}
            />

            {tileSet !== null && (
              <>
                <p className={styles.sectionTitle}>瓦片产物</p>
                <dl className={styles.summary}>
                  {buildTileSetFields(tileSet).map((field) => (
                    <div className={styles.summaryItem} key={field.label}>
                      <dt>{field.label}</dt>
                      <dd title={field.value}>{field.value}</dd>
                    </div>
                  ))}
                </dl>
                {tileSet.errorMessage !== null &&
                  tileSet.errorMessage !== '' && (
                    <p className={styles.errorText}>
                      错误信息：{tileSet.errorMessage}
                    </p>
                  )}
              </>
            )}
          </>
        )}
      </div>
    </AppDialog>
  )
}
