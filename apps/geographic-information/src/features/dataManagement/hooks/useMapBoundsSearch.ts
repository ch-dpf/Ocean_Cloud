import { useEffect, useState } from 'react'
import { getFileMetaPage } from '../services/fileMetaService'
import type { FileMeta, GeographicBounds } from '../types/fileMeta'

/** 框选结果每页条数 */
export const MAP_FILTER_PAGE_SIZE = 20
/** 统计命中文件总大小时的分页条数 */
const TOTAL_SIZE_PAGE_SIZE = 100

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : '查询失败，请稍后重试。'
}

/**
 * 在当前数据集内按经纬度矩形查询文件。
 * 只按框选范围与数据集过滤，不叠加外层列表条件。
 */
export function useMapBoundsSearch(dataSetId: string) {
  const [bounds, setBounds] = useState<GeographicBounds | null>(null)
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState<readonly FileMeta[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // undefined 表示正在统计，null 表示统计失败，数字为全部命中文件的总大小
  const [totalSize, setTotalSize] = useState<number | null | undefined>(
    undefined,
  )

  useEffect(() => {
    if (bounds === null) return
    const controller = new AbortController()
    void (async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setLoading(true)
      setError(null)
      try {
        const result = await getFileMetaPage(
          {
            current: page,
            size: MAP_FILTER_PAGE_SIZE,
            dataSetId,
            ...bounds,
            spatialRelation: 'INTERSECTS',
          },
          controller.signal,
        )
        if (controller.signal.aborted) return
        setRecords(result.records)
        setTotal(Number(result.total))
      } catch (cause) {
        if (controller.signal.aborted) return
        setRecords([])
        setTotal(0)
        setError(errorText(cause))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [bounds, page, dataSetId])

  // 结果分页只展示当前页；总大小按命中范围逐页累加，只随查询范围变化重算。
  useEffect(() => {
    if (bounds === null) return
    const controller = new AbortController()
    void (async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setTotalSize(undefined)
      try {
        let current = 1
        let fetched = 0
        let size = 0
        for (;;) {
          const page = await getFileMetaPage(
            {
              current,
              size: TOTAL_SIZE_PAGE_SIZE,
              dataSetId,
              ...bounds,
              spatialRelation: 'INTERSECTS',
            },
            controller.signal,
          )
          size += page.records.reduce(
            (sum, record) => sum + Number(record.sizeBytes),
            0,
          )
          fetched += page.records.length
          if (page.records.length === 0 || fetched >= Number(page.total)) break
          current += 1
        }
        if (!controller.signal.aborted) setTotalSize(size)
      } catch {
        if (!controller.signal.aborted) setTotalSize(null)
      }
    })()
    return () => controller.abort()
  }, [bounds, dataSetId])

  function search(next: GeographicBounds) {
    setPage(1)
    // 每次查询都换一个新对象，保证相同范围重复点击也会重新请求
    setBounds({ ...next })
  }

  return {
    records,
    total,
    totalSize,
    page,
    pageSize: MAP_FILTER_PAGE_SIZE,
    loading,
    error,
    hasQuery: bounds !== null,
    search,
    goToPage: setPage,
  }
}
