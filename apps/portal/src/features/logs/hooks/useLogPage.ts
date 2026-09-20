import { useEffect, useState } from 'react'
import { LOG_PAGE_SIZE } from '../constants/log'
import type { LogPage, LogQueryParams } from '../types/log'

interface LogPageData<T> {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly records: readonly T[]
  readonly total: number
  readonly current: number
  readonly error: string | null
}

interface UseLogPageOptions<T> {
  /** 按类别传入的查询函数（取自 LOG_QUERIES，引用稳定） */
  readonly fetchPage: (
    query: LogQueryParams,
    signal?: AbortSignal,
  ) => Promise<LogPage<T>>
  readonly username?: string
  readonly startTime?: string
  readonly endTime?: string
  readonly status?: number
  readonly size?: number
}

/**
 * 日志分页查询。筛选条件或每页条数变化时回到第一页；
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 */
export function useLogPage<T>({
  fetchPage,
  username,
  startTime,
  endTime,
  status,
  size = LOG_PAGE_SIZE,
}: UseLogPageOptions<T>) {
  const scopeKey = [
    username ?? '',
    startTime ?? '',
    endTime ?? '',
    status ?? '',
  ]
    .join('|')
    .concat(`|${size}`)
  const [paging, setPaging] = useState({ scopeKey, size, current: 1 })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<LogPageData<T> | null>(null)
  const current =
    paging.scopeKey === scopeKey && paging.size === size ? paging.current : 1
  const queryKey = `${scopeKey}:${current}:${revision}`

  useEffect(() => {
    const controller = new AbortController()
    fetchPage(
      { current, size, username, startTime, endTime, status },
      controller.signal,
    )
      .then((page) => {
        setData({
          key: queryKey,
          records: page.records,
          total: Number(page.total),
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
          error: '日志加载失败。',
        })
      })
    return () => controller.abort()
  }, [current, endTime, fetchPage, queryKey, size, startTime, status, username])

  const ready = data !== null && data.key === queryKey
  return {
    records: ready ? data.records : [],
    total: ready ? data.total : 0,
    current: ready ? data.current : current,
    error: ready ? data.error : null,
    isLoading: !ready,
    goToPage: (next: number) => setPaging({ scopeKey, size, current: next }),
    /** 按当前条件重新查询 */
    refresh: () => setRevision((previous) => previous + 1),
  }
}
