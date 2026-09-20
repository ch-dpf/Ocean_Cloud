import { useEffect, useState } from 'react'
import { TASK_WS_URL } from '../../../config/application'
import { getTaskPage } from '../services/taskService'
import type { TaskRecord } from '../types/task'

/** 工作台上展示的任务条数 */
const OVERVIEW_TASK_LIMIT = 3
/** 需要关注的任务状态：部分失败与失败 */
const ATTENTION_STATUSES = ['PARTIAL_FAILED', 'FAILED'] as const
/** 后端可能出现的任务状态，用于过滤长连接里的非状态文案 */
const TASK_STATUSES = [
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'PARTIAL_FAILED',
  'FAILED',
]

export interface TaskOverviewItem {
  readonly taskNo: string
  readonly taskName: string
  readonly taskStatus: string
  /** 0-100 */
  readonly percent: number
}

/** 长连接里我们关心的字段 */
interface TaskProgressFrame {
  readonly taskStatus?: string
  readonly percent?: number
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const value = source[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readText(
  source: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return ''
}

/** 报文与 REST 相同为 {code,message,data} 信封时取 data，否则用报文本身 */
function unwrap(payload: Record<string, unknown>): Record<string, unknown> {
  const data = payload.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }
  return payload
}

/** 任务帧里的 taskId 放的是任务编号，因此两者都作为任务标识 */
function readFrame(
  payload: Record<string, unknown>,
): readonly [string, TaskProgressFrame] | null {
  const task = unwrap(payload)
  const taskNo = readText(task, ['taskNo', 'taskId'])
  if (taskNo === '') return null
  const completedCount = readNumber(task, 'completedCount') ?? 0
  const failedCount = readNumber(task, 'failedCount') ?? 0
  const totalCount = readNumber(task, 'totalCount')
  const rawStatus = readText(task, ['taskStatus', 'status'])
  const percent =
    totalCount !== null && totalCount > 0
      ? clampPercent(((completedCount + failedCount) / totalCount) * 100)
      : readNumber(task, 'progress')
  return [
    taskNo,
    {
      ...(TASK_STATUSES.includes(rawStatus) ? { taskStatus: rawStatus } : {}),
      ...(percent === null ? {} : { percent: clampPercent(percent) }),
    },
  ]
}

/** 已完成固定 100%；其余优先用长连接进度，其次按已处理数 / 总数换算 */
function resolvePercent(
  taskStatus: string,
  frame: TaskProgressFrame | undefined,
  record: TaskRecord,
): number {
  if (taskStatus === 'COMPLETED') return 100
  if (frame?.percent !== undefined) return frame.percent
  const totalCount = Number(record.totalCount)
  if (!Number.isFinite(totalCount) || totalCount <= 0) return 0
  const processed = Number(record.completedCount) + Number(record.failedCount)
  return clampPercent((processed / totalCount) * 100)
}

/**
 * 工作台运行状态：运行中 / 需要关注的任务数，以及最近三条任务的实时进度。
 * 计数只取分页接口的 total（size=1 的轻量请求），进度来自 /ws/task 长连接。
 */
export function useTaskOverview() {
  const [runningTotal, setRunningTotal] = useState<number | null>(null)
  const [attentionTotal, setAttentionTotal] = useState<number | null>(null)
  const [records, setRecords] = useState<readonly TaskRecord[]>([])
  const [frames, setFrames] = useState<ReadonlyMap<string, TaskProgressFrame>>(
    () => new Map(),
  )

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    Promise.all([
      getTaskPage({ current: 1, size: 1, taskStatus: 'RUNNING' }, signal),
      ...ATTENTION_STATUSES.map((taskStatus) =>
        getTaskPage({ current: 1, size: 1, taskStatus }, signal),
      ),
      getTaskPage({ current: 1, size: OVERVIEW_TASK_LIMIT }, signal),
    ])
      .then(([running, partialFailed, failed, latest]) => {
        setRunningTotal(Number(running.total))
        setAttentionTotal(Number(partialFailed.total) + Number(failed.total))
        setRecords(latest.records)
      })
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const socket = new WebSocket(TASK_WS_URL)
    socket.onmessage = (event) => {
      let payload: unknown
      try {
        payload = JSON.parse(String(event.data))
      } catch {
        return // 忽略非 JSON 报文
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return
      }
      const frame = readFrame(payload as Record<string, unknown>)
      if (frame === null) return
      const [taskNo, progress] = frame
      setFrames((previous) => new Map(previous).set(taskNo, progress))
    }
    return () => socket.close()
  }, [])

  const tasks: readonly TaskOverviewItem[] = records.map((record) => {
    const frame = frames.get(record.taskNo)
    const taskStatus = frame?.taskStatus ?? record.taskStatus
    return {
      taskNo: record.taskNo,
      taskName: record.taskName,
      taskStatus,
      percent: resolvePercent(taskStatus, frame, record),
    }
  })

  return { runningTotal, attentionTotal, tasks }
}
