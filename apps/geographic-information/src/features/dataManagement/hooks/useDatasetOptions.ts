import { useMemo, useState } from 'react'
import {
  DATASET_CATEGORY_LABELS,
  DATASET_CATEGORY_ORDER,
  DATASET_PAGE_SIZE,
} from '../constants/dataset'
import type { GeoDataset } from '../types/dataset'

/**
 * 数据集候选筛选：在已取回的全量数据集上本地过滤，不再发请求。
 * 关键字为空时列出全部；命中分类名时按分类筛选，否则按数据集名称模糊匹配。
 * 列表按 size 分批放开展示，滚动到底再多放一批，避免长列表一次性渲染。
 */
export function useDatasetOptions(
  datasets: readonly GeoDataset[],
  keyword: string,
  size = DATASET_PAGE_SIZE,
) {
  const trimmed = keyword.trim()
  const categoryId = DATASET_CATEGORY_ORDER.find(
    (id) => DATASET_CATEGORY_LABELS[id] === trimmed,
  )
  const matched = useMemo(() => {
    if (categoryId !== undefined) {
      return datasets.filter(
        (dataset) => Number(dataset.categoryId) === categoryId,
      )
    }
    if (trimmed === '') return datasets
    return datasets.filter((dataset) => dataset.dataSetName.includes(trimmed))
  }, [categoryId, datasets, trimmed])

  // 已放开的条数按关键字记忆；关键字一变即回到首批
  const [windowed, setWindowed] = useState({ keyword, count: size })
  const visibleCount = windowed.keyword === keyword ? windowed.count : size
  const visible = matched.slice(0, visibleCount)

  /** 滚动到底部时再多放一批 */
  function loadMore() {
    if (visibleCount >= matched.length) return
    setWindowed({ keyword, count: visibleCount + size })
  }

  return {
    datasets: visible,
    hasMore: visibleCount < matched.length,
    loadMore,
  }
}
