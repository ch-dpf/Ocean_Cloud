import { useEffect, useState } from 'react'

/** 一个任务的最新进度 */
export interface UploadTaskItem {
  readonly taskNo: string
  /** 任务类型标识：帧里的 taskType，缺失时取任务编号里最后一个下划线之前的部分 */
  readonly kind: string
  readonly taskName: string
  /** 后端标记任务已结束 */
  readonly done: boolean
  readonly percent: number | null
  readonly completedCount: number
  readonly failedCount: number
  readonly totalCount: number | null
  /** 当前阶段代号（currentStage.code）：上传任务是 storing，处理任务见处理阶段常量 */
  readonly stageCode: string
  /** 阶段文案，取 currentStage.message（后端给的中文，含文件名与字节进度） */
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

/**
 * 从帧里取出任务体：进度帧是 { eventType, task, timestamp }，因此优先取 task；
 * 另外兼容 { code, message, data } 信封的报文，都没有时可认为任务体已平铺在顶层。
 */
function unwrapTask(payload: Record<string, unknown>): Record<string, unknown> {
  for (const key of ['task', 'data']) {
    const nested = payload[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>
    }
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

/** 取帧里的嵌套对象（result、currentStage）；缺失或类型不对时返回空对象 */
function readObject(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = source[key]
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/**
 * 任务是否已结束：终态状态有 COMPLETED / PARTIAL_FAILED / FAILED，
 * 另外 endTime 一旦填上就说明后端已经收尾。
 */
function readDone(task: Record<string, unknown>): boolean {
  if (readText(task, ['endTime']) !== '') return true
  const status = readText(task, ['status'])
  return (
    status === 'COMPLETED' || status === 'PARTIAL_FAILED' || status === 'FAILED'
  )
}

/**
 * 帧里的进度百分比：
 * - 上传任务用后端给的 overallPercent（0-100，含存储阶段的字节级进度）；
 * - 处理任务的 overallPercent 是 null，因此改用当前阶段内部的 completed / total，
 *   即条在可能 0-100 的每个阶段内各自走一遍。
 */
function readPercent(
  task: Record<string, unknown>,
  stage: Record<string, unknown>,
): number | null {
  const reported = readNumber(task, 'overallPercent')
  if (reported !== null) return clampPercent(reported)
  const completed = readNumber(stage, 'completed')
  const total = readNumber(stage, 'total')
  if (completed === null || total === null || total <= 0) return null
  return clampPercent((completed / total) * 100)
}

/**
 * 任务进度帧（/ws/task）示例：
 * { eventType: 'task_update', task: { taskId, taskName, taskType, status, overallPercent,
 *   result: { total, succeeded, failed, unit },
 *   currentStage: { code, message, completed, total, unit },
 *   startTime, endTime, version }, timestamp }
 * 任务类型直接取 taskType：任务编号已改成 terrain_20261010151223_F7708D0C32AA 这类格式，
 * 从编号前缀推不出 kind，猜错反而会让任务被 kind 过滤掉。
 */
function readTask(task: Record<string, unknown>): UploadTaskItem | null {
  // 帧里的 taskId 与任务列表的任务编号（taskNo）是同一个值，因此都作为任务标识
  const taskNo = readText(task, ['taskNo', 'taskId'])
  if (taskNo === '') return null
  // 结果计数与阶段信息都是嵌套对象
  const result = readObject(task, 'result')
  const stage = readObject(task, 'currentStage')
  return {
    taskNo,
    kind: readText(task, ['taskType']),
    taskName: readText(task, ['taskName', 'taskType']),
    done: readDone(task),
    percent: readPercent(task, stage),
    completedCount: readNumber(result, 'succeeded') ?? 0,
    failedCount: readNumber(result, 'failed') ?? 0,
    totalCount: readNumber(result, 'total'),
    stageCode: readText(stage, ['code']),
    // 阶段文案最有用（例如「正在存储文件：x.tif（2.0 MB/149.2 MB）」）
    statusText: readText(stage, ['message']),
  }
}

/** 任务创建后的占位条目：等 /ws/task 的第一帧到达时由帧内容替换 */
function createPendingTask(taskId: string, totalCount: number): UploadTaskItem {
  return {
    taskNo: taskId,
    // 占位条目只用于导入任务
    kind: 'GIS_IMPORT',
    taskName: '上传任务',
    done: false,
    // 进度未知，因此不显示具体百分比，进度条改走流动动效
    percent: null,
    completedCount: 0,
    failedCount: 0,
    totalCount,
    stageCode: '',
    statusText: '上传中',
    pending: true,
  }
}

/**
 * 任务进度长连接：页面打开期间保持连接，按任务编号累积（最新任务排在最前）。
 * 刷新页面后列表清空 —— 历史任务需要后端提供任务列表接口。
 * kinds 按任务类型过滤展示（传空数组表示不过滤）：数据管理页只看导入，
 * 数据处理页只看三类处理任务；内部仍累积全部帧，避免来回切页面时丢进度。
 */
export function useUploadTasks(kinds: readonly string[] = []) {
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

  // 过滤只影响对外展示的列表，内部仍保留全部帧
  const visibleTasks =
    kinds.length === 0
      ? tasks
      : tasks.filter((task) => kinds.includes(task.kind))

  return { tasks: visibleTasks, clearFinished, addPendingTask, failTask }
}
