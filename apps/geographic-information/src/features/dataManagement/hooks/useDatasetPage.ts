import { useCallback, useEffect, useState } from 'react'
import { getDatasetPage } from '../services/datasetService'
import type { GeoDataset } from '../types/dataset'

/** 卡片墙的筛选条件：分类来自侧边栏的分类选择，关键字来自工具栏搜索框 */
export interface DatasetWallFilters {
  readonly categoryId?: number
  readonly dataSetName?: string
}

interface DatasetPageData {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly records: readonly GeoDataset[]
  readonly total: number
  readonly error: string | null
}

/**
 * 数据集卡片墙分页查询（/dataSet/page）。分类、关键字或每页条数变化时回到第一页，
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 * 列表查询不涉及轮廓：卡片预览的轮廓在点击该卡片时用 /dataSet/{id}/footprints 单独取。
 * enabled 由调用方按当前视图传入，不在卡片墙时不请求。
 */
export function useDatasetPage(
  filters: DatasetWallFilters = {},
  size = 10,
  enabled = true,
) {
  const { categoryId, dataSetName } = filters
  const filterKey = [categoryId ?? '', dataSetName ?? ''].join('\u0000')
  const [paging, setPaging] = useState({ filterKey, size, current: 1 })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<DatasetPageData | null>(null)
  // 条件或每页条数变化时直接按第一页查询，不必先按旧页码多打一次请求
  const current =
    paging.filterKey === filterKey && paging.size === size ? paging.current : 1
  const queryKey = enabled
    ? `${filterKey}:${current}:${size}:${revision}`
    : null

  useEffect(() => {
    if (queryKey === null) return
    const controller = new AbortController()
    getDatasetPage(
      { current, size, categoryId, dataSetName },
      controller.signal,
    )
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
          error: '数据集加载失败。',
        })
      })
    return () => controller.abort()
  }, [categoryId, current, dataSetName, filterKey, queryKey, size])

  const ready = data !== null && data.key === queryKey
  const refresh = useCallback(
    () => setRevision((previous) => previous + 1),
    [setRevision],
  )

  return {
    records: ready ? data.records : [],
    total: ready ? data.total : 0,
    current,
    error: ready ? data.error : null,
    isLoading: queryKey !== null && !ready,
    goToPage: (next: number) => setPaging({ filterKey, size, current: next }),
    /** 按当前条件重新查询 */
    refresh,
  }
}
