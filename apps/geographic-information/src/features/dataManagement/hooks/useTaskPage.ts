import { useEffect, useState } from 'react'
import { TASK_PAGE_SIZE } from '../constants/task'
import { getTaskPage } from '../services/taskService'
import type { TaskRecord } from '../types/task'

interface TaskPageData {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly records: readonly TaskRecord[]
  readonly total: number
  readonly current: number
  readonly error: string | null
}

interface UseTaskPageOptions {
  /** 不在该页面时传 false，不发起请求 */
  readonly enabled: boolean
  /** 处理类型：TERRAIN、IMAGERY、VECTOR；不传表示不按类型筛选 */
  readonly processingType?: string
  /** 任务状态；不传表示全部状态 */
  readonly taskStatus?: string
  readonly size?: number
}

/**
 * 任务分页查询。任务类型、处理类型或状态变化时回到第一页；
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 */
export function useTaskPage({
  enabled,
  processingType,
  taskStatus,
  size = TASK_PAGE_SIZE,
}: UseTaskPageOptions) {
  const scopeKey = enabled
    ? `${processingType ?? ''}:${taskStatus ?? ''}`
    : null
  const [paging, setPaging] = useState({ scopeKey, size, current: 1 })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<TaskPageData | null>(null)
  // 任一筛选条件或每页条数变化时直接按第一页查询，不必先按旧页码多打一次请求
  const current =
    paging.scopeKey === scopeKey && paging.size === size ? paging.current : 1
  const queryKey =
    scopeKey === null ? null : `${scopeKey}:${current}:${size}:${revision}`

  useEffect(() => {
    if (queryKey === null) return
    const controller = new AbortController()
    getTaskPage(
      { current, size, processingType, taskStatus },
      controller.signal,
    )
      .then((page) => {
        const total = Number(page.total)
        setData({
          key: queryKey,
          records: page.records,
          total,
          current: Number(page.current) || current,
          error: null,
        })
      })
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
        if (controller.signal.aborted) return
        setData({
          key: queryKey,
          records: [],
          total: 0,
          current,
          error: '任务列表加载失败。',
        })
      })
    return () => controller.abort()
  }, [current, processingType, queryKey, size, taskStatus])

  const ready = data !== null && data.key === queryKey
  return {
    records: ready ? data.records : [],
    total: ready ? data.total : 0,
    current: ready ? data.current : current,
    error: ready ? data.error : null,
    isLoading: queryKey !== null && !ready,
    goToPage: (next: number) => setPaging({ scopeKey, size, current: next }),
    /** 按当前条件重新查询 */
    refresh: () => setRevision((previous) => previous + 1),
  }
}
