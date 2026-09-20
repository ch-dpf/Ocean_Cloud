import { useEffect, useState } from 'react'
import { DATASET_PAGE_SIZE } from '../constants/dataset'
import { getDatasetPage } from '../services/datasetService'
import type { GeoDataset } from '../types/dataset'

interface DatasetSearchResult {
  /** 结果对应的关键字，用于判断是否仍是当前搜索的结果 */
  readonly keyword: string
  readonly records: readonly GeoDataset[]
  readonly hasMore: boolean
}

/** 输入防抖时长：停止输入后一段时间再查询 */
const SEARCH_DEBOUNCE_MS = 300

/**
 * 侧边栏数据集搜索：按名称分页查询 /dataSet/page。
 * 关键字为空时不请求；关键字变化会取消上一次未完成的请求；
 * 滚动到底再多取一批（从第一页起按更大的 size 重取，保证总数与顺序稳定）。
 */
export function useDatasetSearch(keyword: string) {
  const trimmed = keyword.trim()
  const [debounced, setDebounced] = useState('')
  const [windowed, setWindowed] = useState({
    keyword: '',
    size: DATASET_PAGE_SIZE,
  })
  const [data, setData] = useState<DatasetSearchResult | null>(null)

  // 输入停下后再查询；清空输入时由下面的派生值立即复位，不在 effect 里同步改状态
  useEffect(() => {
    if (trimmed === '') return
    const timer = setTimeout(() => setDebounced(trimmed), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [trimmed])

  const debouncedKeyword = trimmed === '' ? '' : debounced

  // 关键字变化时回到首批
  const requestedSize =
    windowed.keyword === debouncedKeyword ? windowed.size : DATASET_PAGE_SIZE

  useEffect(() => {
    if (debouncedKeyword === '') return
    const controller = new AbortController()
    getDatasetPage(
      { current: 1, size: requestedSize, dataSetName: debouncedKeyword },
      controller.signal,
    )
      .then((page) => {
        setData({
          keyword: debouncedKeyword,
          records: page.records,
          hasMore: page.records.length < Number(page.total),
        })
      })
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
        if (controller.signal.aborted) return
        setData({ keyword: debouncedKeyword, records: [], hasMore: false })
      })
    return () => controller.abort()
  }, [debouncedKeyword, requestedSize])

  /** 滚动到底部再多取一批 */
  function loadMore() {
    if (data === null || !data.hasMore) return
    setWindowed({
      keyword: debouncedKeyword,
      size: requestedSize + DATASET_PAGE_SIZE,
    })
  }

  const ready = data !== null && data.keyword === debouncedKeyword
  return {
    records: ready ? data.records : [],
    hasMore: ready && data.hasMore,
    // 只要输入框非空、且还没有对应当前关键字的请求结果，就算在搜索中（含防抖等待）
    isLoading: !ready && trimmed !== '',
    loadMore,
  }
}
