import { useEffect, useState } from 'react'
import { TASK_PAGE_SIZE, TASK_TYPE_IMPORT } from '../constants/task'
import { getTaskPage } from '../services/taskService'
import type { TaskRecord } from '../types/task'

interface TaskPageData {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly records: readonly TaskRecord[]
  readonly total: number
  readonly current: number
  readonly lastPage: number
  readonly error: string | null
}

/**
 * 分页查询任务（导入记录）。enabled 为 false（不在导入记录页）时不发起请求；
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 */
export function useTaskPage(enabled: boolean, size = TASK_PAGE_SIZE) {
  const [current, setCurrent] = useState(1)
  const queryKey = enabled ? `${TASK_TYPE_IMPORT}:${current}:${size}` : null
  const [data, setData] = useState<TaskPageData | null>(null)

  useEffect(() => {
    if (queryKey === null) return
    const controller = new AbortController()
    getTaskPage(
      { current, size, taskType: TASK_TYPE_IMPORT },
      controller.signal,
    )
      .then((page) => {
        const total = Number(page.total)
        setData({
          key: queryKey,
          records: page.records,
          total,
          current: Number(page.current) || current,
          lastPage: Math.max(1, Math.ceil(total / size)),
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
          lastPage: 1,
          error: '导入记录加载失败。',
        })
      })
    return () => controller.abort()
  }, [current, queryKey, size])

  const ready = data !== null && data.key === queryKey
  return {
    records: ready ? data.records : [],
    total: ready ? data.total : 0,
    current: ready ? data.current : current,
    lastPage: ready ? data.lastPage : 1,
    error: ready ? data.error : null,
    isLoading: queryKey !== null && !ready,
    goToPage: (next: number) => setCurrent(next),
  }
}
