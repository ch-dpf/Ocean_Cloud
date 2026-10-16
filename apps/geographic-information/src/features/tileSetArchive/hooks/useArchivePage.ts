import { useEffect, useState } from 'react'
import { ARCHIVE_PAGE_SIZE } from '../constants/archive'
import { getArchivePage } from '../services/archiveService'
import type { TileSetArchive } from '../types/archive'

interface ArchivePageData {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly records: readonly TileSetArchive[]
  readonly total: number
  readonly error: string | null
}

/**
 * 归档记录分页查询。接口没有筛选参数，因此只按页码与每页条数查询；
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 */
export function useArchivePage(size = ARCHIVE_PAGE_SIZE) {
  const [current, setCurrent] = useState(1)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<ArchivePageData | null>(null)
  const queryKey = `${current}:${size}:${revision}`

  useEffect(() => {
    const controller = new AbortController()
    getArchivePage({ current, size }, controller.signal)
      .then((page) => {
        setData({
          key: queryKey,
          records: page.records,
          total: Number(page.total),
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
          error: '归档记录加载失败。',
        })
      })
    return () => controller.abort()
  }, [current, queryKey, size])

  const ready = data !== null && data.key === queryKey
  return {
    records: ready ? data.records : [],
    total: ready ? data.total : 0,
    current,
    error: ready ? data.error : null,
    isLoading: !ready,
    goToPage: (next: number) => setCurrent(next),
    /** 按当前条件重新查询（归档、重试后刷新） */
    refresh: () => setRevision((previous) => previous + 1),
  }
}
