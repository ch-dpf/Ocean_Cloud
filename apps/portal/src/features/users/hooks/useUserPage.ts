import { useEffect, useState } from 'react'
import { USER_PAGE_SIZE } from '../constants/user'
import { getUserPage } from '../services/userService'
import type { MemberUser } from '../types/user'

interface UserPageData {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly records: readonly MemberUser[]
  readonly total: number
  readonly current: number
  readonly error: string | null
}

/**
 * 用户分页查询。每页条数变化时回到第一页；
 * 只在结果对应当前查询时才展示，请求被取消时不覆盖已有结果。
 */
export function useUserPage(size = USER_PAGE_SIZE) {
  const [paging, setPaging] = useState({ size, current: 1 })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<UserPageData | null>(null)
  const current = paging.size === size ? paging.current : 1
  const queryKey = `${size}:${current}:${revision}`

  useEffect(() => {
    const controller = new AbortController()
    getUserPage({ current, size }, controller.signal)
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
          error: '用户列表加载失败。',
        })
      })
    return () => controller.abort()
  }, [current, queryKey, size])

  const ready = data !== null && data.key === queryKey
  return {
    records: ready ? data.records : [],
    total: ready ? data.total : 0,
    current: ready ? data.current : current,
    error: ready ? data.error : null,
    isLoading: !ready,
    goToPage: (next: number) => setPaging({ size, current: next }),
    /** 按当前条件重新查询 */
    refresh: () => setRevision((previous) => previous + 1),
  }
}
