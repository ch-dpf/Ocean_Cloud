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
  /** 任务已创建但还没收到任何进度帧：进度条走流动动效，避免看起来像卡住 */
  readonly pending?: boolean
}

/**
 * 任务进度长连接：与系统指标相同，使用同源相对地址，由开发代理或部署网关转发。
 * 任务创建后先插入占位条目，第一帧到达前也能在「上传进度」里看到这一条。
 */
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
  if (typeof value === 'number' && Number.isFinite(value)) return value
  // 后端会把数字写成字符串（计数、分页字段都是这种风格），这里一并兼容
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
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

/**
 * 进度百分比：优先用后端给的 progress（0-100）。
 * 存储文件阶段后端给的是字节级进度，只按完成数 / 总数算会一直停在 0%，
 * 因此仅在 progress 缺失时才退回「已处理数 / 总数」。
 */
function readPercent(
  source: Record<string, unknown>,
  processedCount: number,
  totalCount: number | null,
): number | null {
  const reported = readNumber(source, 'progress')
  if (reported !== null) return clampPercent(reported)
  if (totalCount !== null && totalCount > 0) {
    return clampPercent((processedCount / totalCount) * 100)
  }
  return null
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

/** 任务创建后的占位条目：等 /ws/task 的第一帧到达时由帧内容替换 */
function createPendingTask(taskId: string, totalCount: number): UploadTaskItem {
  return {
    taskNo: taskId,
    taskName: '上传任务',
    done: false,
    // 进度未知，因此不显示具体百分比，进度条改走流动动效
    percent: null,
    completedCount: 0,
    failedCount: 0,
    totalCount,
    statusText: '上传中',
    pending: true,
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

  /** 插入上传占位条目：同一编号已存在时移到最前 */
  function addPendingTask(taskId: string, totalCount: number) {
    setTasks((prev) => [
      createPendingTask(taskId, totalCount),
      ...prev.filter((task) => task.taskNo !== taskId),
    ])
  }

  /** 建任务或上传请求失败时不会有 WS 帧，手动把占位收口为失败 */
  function failTask(taskId: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.taskNo === taskId
          ? { ...task, done: true, percent: null, statusText: '上传失败' }
          : task,
      ),
    )
  }

  /** 清掉已完成的任务，只看进行中的 */
  function clearFinished() {
    setTasks((prev) => prev.filter((task) => !task.done))
  }

  return { tasks, clearFinished, addPendingTask, failTask }
}
