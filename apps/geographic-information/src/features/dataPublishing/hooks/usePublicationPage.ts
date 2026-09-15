import { useEffect, useState } from 'react'
import { PUBLICATION_PAGE_SIZE } from '../constants/publication'
import { getTerrainPublicationPage } from '../services/publicationService'
import type { TerrainPublication } from '../types/publication'

interface PublicationPageData {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly records: readonly TerrainPublication[]
  readonly total: number
  readonly current: number
  readonly error: string | null
}

interface UsePublicationPageOptions {
  /** 服务状态；不传表示不按状态筛选 */
  readonly status?: string
  readonly size?: number
}

/**
 * 已发布服务分页查询。状态或每页条数变化时回到第一页；
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 */
export function usePublicationPage({
  status,
  size = PUBLICATION_PAGE_SIZE,
}: UsePublicationPageOptions) {
  const scopeKey = status ?? ''
  const [paging, setPaging] = useState({ scopeKey, size, current: 1 })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<PublicationPageData | null>(null)
  // 状态或每页条数变化时直接按第一页查询，不必先按旧页码多打一次请求
  const current =
    paging.scopeKey === scopeKey && paging.size === size ? paging.current : 1
  const queryKey = `${scopeKey}:${current}:${size}:${revision}`

  useEffect(() => {
    const controller = new AbortController()
    getTerrainPublicationPage({ current, size, status }, controller.signal)
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
          error: '服务列表加载失败。',
        })
      })
    return () => controller.abort()
  }, [current, queryKey, size, status])

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
