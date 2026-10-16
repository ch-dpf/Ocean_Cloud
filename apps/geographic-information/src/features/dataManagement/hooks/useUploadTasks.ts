import { useEffect, useState } from 'react'
import { getTransferDetail } from '../services/fileTransferService'
import type { UploadChunkResult } from '../services/gisUpload'

export interface UploadTaskItem {
  readonly taskNo: string
  readonly kind: string
  readonly taskName: string
  readonly status: string
  readonly done: boolean
  readonly percent: number | null
  readonly completedCount: number
  readonly failedCount: number
  readonly totalCount: number | null
  readonly stageCode: string
  readonly statusText: string
  readonly pending?: boolean
  /** WebSocket 任务版本与数据库记录版本分别比较，不混用。 */
  readonly version: number | null
  readonly recordVersion: number | null
}

const TASK_WS_URL = '/ws/task'
const TERMINAL_STATUSES = new Set(['COMPLETED', 'PARTIAL_FAILED', 'FAILED'])

function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const value = source[key]
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
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

function readObject(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = source[key]
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readPercent(
  task: Record<string, unknown>,
  stage: Record<string, unknown>,
): number | null {
  const reported = readNumber(task, 'overallPercent')
  if (reported !== null) return Math.min(100, Math.max(0, Math.round(reported)))
  const completed = readNumber(stage, 'completed')
  const total = readNumber(stage, 'total')
  return completed === null || total === null || total <= 0
    ? null
    : Math.min(100, Math.max(0, Math.round((completed / total) * 100)))
}

/** 读取当前 /ws/task 契约：{ eventType, task, timestamp }。 */
function readTask(task: Record<string, unknown>): UploadTaskItem | null {
  const taskNo = readText(task, ['taskId'])
  if (taskNo === '') return null
  const result = readObject(task, 'result')
  const stage = readObject(task, 'currentStage')
  const status = readText(task, ['status'])
  const kind = readText(task, ['taskType'])
  const stageCode = readText(stage, ['code'])
  const done = TERMINAL_STATUSES.has(status)
  return {
    taskNo,
    kind,
    taskName: readText(task, ['taskName']),
    status,
    done,
    percent:
      kind === 'GIS_UPLOAD' && !done && stageCode === 'EXTRACTING_METADATA'
        ? null
        : readPercent(task, stage),
    completedCount: readNumber(result, 'succeeded') ?? 0,
    failedCount: readNumber(result, 'failed') ?? 0,
    totalCount: readNumber(result, 'total'),
    stageCode,
    statusText: readText(stage, ['message']),
    version: readNumber(task, 'version'),
    recordVersion: null,
  }
}

/** 两个来源各自按版本合并，已结束任务不能被晚到的上传响应或旧帧重新置为进行中。 */
function mergeTask(
  previous: UploadTaskItem,
  next: UploadTaskItem,
): UploadTaskItem {
  if (previous.done && previous.status !== 'INTERRUPTED') return previous
  if (previous.status === 'INTERRUPTED' && !next.done) return previous
  if (
    previous.version !== null &&
    next.version !== null &&
    next.version <= previous.version
  )
    return previous
  if (
    previous.recordVersion !== null &&
    next.recordVersion !== null &&
    next.recordVersion < previous.recordVersion
  )
    return previous
  const keepExtraction =
    previous.kind === 'GIS_UPLOAD' &&
    previous.stageCode === 'EXTRACTING_METADATA' &&
    !next.done &&
    next.stageCode === 'UPLOADING'
  return {
    ...next,
    taskName: next.taskName || previous.taskName,
    version: next.version ?? previous.version,
    recordVersion: next.recordVersion ?? previous.recordVersion,
    stageCode: keepExtraction ? previous.stageCode : next.stageCode,
    statusText: keepExtraction ? previous.statusText : next.statusText,
    percent: keepExtraction
      ? null
      : previous.kind === 'GIS_UPLOAD' &&
          next.stageCode === 'UPLOADING' &&
          !next.done &&
          next.percent === null
        ? previous.percent
        : next.percent,
    completedCount: Math.max(previous.completedCount, next.completedCount),
    failedCount: Math.max(previous.failedCount, next.failedCount),
    totalCount: next.totalCount ?? previous.totalCount,
    pending: false,
  }
}

function upsertTask(
  tasks: readonly UploadTaskItem[],
  next: UploadTaskItem,
): readonly UploadTaskItem[] {
  const previous = tasks.find((task) => task.taskNo === next.taskNo)
  return previous === undefined
    ? [next, ...tasks]
    : tasks.map((task) =>
        task.taskNo === next.taskNo ? mergeTask(task, next) : task,
      )
}

function createPendingTask(taskId: string, totalCount: number): UploadTaskItem {
  return {
    taskNo: taskId,
    kind: 'GIS_UPLOAD',
    taskName: 'GIS数据导入',
    status: 'RUNNING',
    done: false,
    percent: null,
    completedCount: 0,
    failedCount: 0,
    totalCount,
    stageCode: 'UPLOADING',
    statusText: '正在传输文件',
    pending: true,
    version: null,
    recordVersion: null,
  }
}

/** WebSocket 实时展示；活动导入同时读取数据库记录，断线后仍能正确结束。 */
export function useUploadTasks(kinds: readonly string[] = []) {
  const [tasks, setTasks] = useState<readonly UploadTaskItem[]>([])

  useEffect(() => {
    let disposed = false
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    function connect() {
      if (disposed) return
      socket = new WebSocket(TASK_WS_URL)
      socket.onmessage = (event) => {
        let payload: unknown
        try {
          payload = JSON.parse(String(event.data))
        } catch {
          return
        }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload))
          return
        const task = readTask(
          readObject(payload as Record<string, unknown>, 'task'),
        )
        if (task !== null) setTasks((previous) => upsertTask(previous, task))
      }
      socket.onclose = () => {
        if (!disposed) reconnectTimer = setTimeout(connect, 2000)
      }
    }
    connect()
    return () => {
      disposed = true
      clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])

  const activeImportKey = tasks
    .filter((task) => task.kind === 'GIS_UPLOAD' && !task.done)
    .map((task) => task.taskNo)
    .sort()
    .join('\u0000')

  useEffect(() => {
    if (activeImportKey === '') return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function poll() {
      await Promise.allSettled(
        activeImportKey.split('\u0000').map(async (taskNo) => {
          const record = await getTransferDetail(taskNo, controller.signal)
          if (controller.signal.aborted) return
          const done = TERMINAL_STATUSES.has(record.recordStatus)
          const extracting = record.currentStage === 'EXTRACTING_METADATA'
          const snapshot: UploadTaskItem = {
            taskNo,
            kind: 'GIS_UPLOAD',
            taskName: 'GIS数据导入',
            status: record.recordStatus,
            done,
            percent: done
              ? 100
              : extracting
                ? null
                : Math.min(99, Number(record.progress)),
            completedCount: Number(record.completedCount),
            failedCount: Number(record.failedCount),
            totalCount: Number(record.totalCount),
            stageCode: record.currentStage,
            statusText:
              record.errorMessage ||
              (done
                ? '导入结束'
                : extracting
                  ? '文件传输完成，正在提取空间信息'
                  : '正在传输文件'),
            version: null,
            recordVersion: Number(record.version),
          }
          setTasks((previous) => upsertTask(previous, snapshot))
        }),
      )
      if (!controller.signal.aborted)
        timer = setTimeout(() => void poll(), 2500)
    }
    void poll()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [activeImportKey])

  function addPendingTask(taskId: string, totalCount: number) {
    // 首帧可能早于首块 HTTP 响应到达，不能用占位覆盖真实进度。
    setTasks((previous) =>
      previous.some((task) => task.taskNo === taskId)
        ? previous
        : [createPendingTask(taskId, totalCount), ...previous],
    )
  }

  function updateChunkProgress(result: UploadChunkResult, totalCount: number) {
    const done = TERMINAL_STATUSES.has(result.status)
    const snapshot: UploadTaskItem = {
      ...createPendingTask(result.taskId, totalCount),
      status: result.status,
      done,
      completedCount: Number(result.completedCount),
      failedCount: Number(result.failedCount),
      stageCode: result.currentStage,
      percent: done ? 100 : null,
      pending: false,
      statusText: done
        ? '导入结束'
        : result.currentStage === 'EXTRACTING_METADATA'
          ? '文件传输完成，正在提取空间信息'
          : '正在传输文件',
    }
    setTasks((previous) => upsertTask(previous, snapshot))
  }

  function failTask(taskId: string) {
    setTasks((previous) =>
      previous.map((task) =>
        task.taskNo === taskId && !task.done
          ? {
              ...task,
              done: true,
              pending: false,
              status: 'INTERRUPTED',
              percent: null,
              statusText: '上传中断，请在传输记录中查看结果',
            }
          : task,
      ),
    )
  }

  return {
    tasks:
      kinds.length === 0
        ? tasks
        : tasks.filter((task) => kinds.includes(task.kind)),
    clearFinished: () =>
      setTasks((previous) => previous.filter((task) => !task.done)),
    addPendingTask,
    updateChunkProgress,
    failTask,
  }
}
