import { useEffect, useState } from 'react'
import {
  DATASET_CATEGORY_LABELS,
  DATASET_CATEGORY_ORDER,
  DATASET_PAGE_SIZE,
} from '../constants/dataset'
import { getDatasetPage } from '../services/datasetService'
import type { GeoDataset } from '../types/dataset'

interface DatasetOptionsData {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly datasets: readonly GeoDataset[]
  readonly total: number
  readonly lastPage: number
  readonly error: string | null
}

/**
 * 数据集候选分页查询。
 * 关键字为空时列出全部数据集；关键字命中分类名时按分类查询，否则按数据集名称查询。
 */
export function useDatasetOptions(keyword: string, size = DATASET_PAGE_SIZE) {
  const trimmed = keyword.trim()
  const categoryId = DATASET_CATEGORY_ORDER.find(
    (id) => DATASET_CATEGORY_LABELS[id] === trimmed,
  )
  const dataSetName =
    categoryId === undefined && trimmed !== '' ? trimmed : undefined
  // 不传 categoryId 时后端会按 0 处理，因此「全部数据集」需要逐分类查询再合并
  const isAll = categoryId === undefined && dataSetName === undefined
  const scopeKey = isAll
    ? 'all'
    : categoryId !== undefined
      ? `category:${categoryId}`
      : `name:${dataSetName}`
  const [paging, setPaging] = useState({ scopeKey, current: 1 })
  const [data, setData] = useState<DatasetOptionsData | null>(null)
  // 筛选条件变化时回到第一页
  const current = paging.scopeKey === scopeKey ? paging.current : 1
  const queryKey = `${scopeKey}:${current}:${size}`

  useEffect(() => {
    const controller = new AbortController()
    const requests = isAll
      ? DATASET_CATEGORY_ORDER.map((id) =>
          getDatasetPage({ current, size, categoryId: id }, controller.signal),
        )
      : [
          getDatasetPage(
            { current, size, categoryId, dataSetName },
            controller.signal,
          ),
        ]
    Promise.all(requests)
      .then((pages) => {
        setData({
          key: queryKey,
          datasets: pages.flatMap((page) => page.records),
          total: pages.reduce((sum, page) => sum + Number(page.total), 0),
          lastPage: Math.max(
            1,
            ...pages.map((page) => Math.ceil(Number(page.total) / size)),
          ),
          error: null,
        })
      })
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
        if (controller.signal.aborted) return
        setData({
          key: queryKey,
          datasets: [],
          total: 0,
          lastPage: 1,
          error: '数据集加载失败。',
        })
      })
    return () => controller.abort()
  }, [categoryId, current, dataSetName, isAll, queryKey, size])

  function goToPage(next: number) {
    setPaging({ scopeKey, current: next })
  }

  const ready = data !== null && data.key === queryKey
  return {
    datasets: ready ? data.datasets : [],
    total: ready ? data.total : 0,
    lastPage: ready ? data.lastPage : 1,
    error: ready ? data.error : null,
    isLoading: !ready,
    current,
    goToPage,
  }
}
