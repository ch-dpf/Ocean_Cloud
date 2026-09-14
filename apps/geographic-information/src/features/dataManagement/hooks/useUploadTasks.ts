import { useEffect, useState } from 'react'

/** 一个上传任务的最新进度 */
export interface UploadTaskItem {
  readonly taskNo: string
  readonly taskName: string
  /** 后端标记任务已结束 */
  readonly done: boolean
  readonly percent: number | null
  readonly completedCount: number
  readonly failedCount: number
  readonly totalCount: number | null
  /** 状态文案，优先取 message（后端给的中文），status / stage 是机器码兜底 */
  readonly statusText: string
}

/** 任务进度长连接：与系统指标相同，使用同源相对地址，由开发代理或部署网关转发 */
const TASK_WS_URL = '/ws/task'

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** 报文与 REST 相同为 {code,message,data} 信封时取 data，否则用报文本身 */
function unwrapTask(payload: Record<string, unknown>): Record<string, unknown> {
  const data = payload.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }
  return payload
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

/** 优先用已处理数 / 总数，缺少总数时退回后端给的 progress 百分比 */
function readPercent(
  source: Record<string, unknown>,
  processedCount: number,
  totalCount: number | null,
): number | null {
  if (totalCount !== null && totalCount > 0) {
    return clampPercent((processedCount / totalCount) * 100)
  }
  const value = readNumber(source, 'progress')
  return value === null ? null : clampPercent(value)
}

function readTask(task: Record<string, unknown>): UploadTaskItem | null {
  // 任务帧里的 taskId 放的是任务编号，因此两者都作为任务标识
  const taskNo = readText(task, ['taskNo', 'taskId'])
  if (taskNo === '') return null
  const completedCount = readNumber(task, 'completedCount') ?? 0
  const failedCount = readNumber(task, 'failedCount') ?? 0
  const totalCount = readNumber(task, 'totalCount')
  return {
    taskNo,
    taskName: readText(task, ['taskName', 'taskType']),
    done: task.done === true,
    percent: readPercent(task, completedCount + failedCount, totalCount),
    completedCount,
    failedCount,
    totalCount,
    statusText: readText(task, ['message', 'status', 'stage']),
  }
}

/**
 * 上传任务进度：页面打开期间保持连接，按任务编号累积（最新任务排在最前）。
 * 刷新页面后列表清空 —— 历史任务需要后端提供任务列表接口。
 */
export function useUploadTasks() {
  const [tasks, setTasks] = useState<readonly UploadTaskItem[]>([])

  useEffect(() => {
    const socket = new WebSocket(TASK_WS_URL)
    socket.onmessage = (event) => {
      let payload: unknown
      try {
        payload = JSON.parse(String(event.data))
      } catch {
        return // 忽略非 JSON 报文
      }
      if (!payload || typeof payload !== 'object') return
      const task = readTask(unwrapTask(payload as Record<string, unknown>))
      if (task === null) return
      setTasks((prev) => {
        const index = prev.findIndex((item) => item.taskNo === task.taskNo)
        if (index === -1) return [task, ...prev]
        const next = [...prev]
        next[index] = task
        return next
      })
    }
    return () => socket.close()
  }, [])

  /** 清掉已完成的任务，只看进行中的 */
  function clearFinished() {
    setTasks((prev) => prev.filter((task) => !task.done))
  }

  return { tasks, clearFinished }
}
