import { useEffect, useRef, useState } from 'react'
import {
  DATASET_CATEGORY_LABELS,
  DATASET_CATEGORY_ORDER,
  DATASET_PAGE_SIZE,
} from '../constants/dataset'
import { getDatasetPage } from '../services/datasetService'
import type { GeoDataset } from '../types/dataset'

interface DatasetScopeState {
  /** 该筛选条件下已加载的记录，按页累积 */
  readonly datasets: readonly GeoDataset[]
  /** 后端返回的总条数 */
  readonly total: number
  /** 已加载到第几页，0 表示第一页还没回来 */
  readonly loadedPages: number
  /** 是否正在加载后续页 */
  readonly isLoadingMore: boolean
  readonly error: string | null
}

const EMPTY_SCOPE: DatasetScopeState = {
  datasets: [],
  total: 0,
  loadedPages: 0,
  isLoadingMore: false,
  error: null,
}

/**
 * 数据集候选查询，滚动加载。
 * 关键字为空时列出全部数据集（不传 categoryId）；命中分类名时按分类查询，否则按数据集名称查询。
 * 每个筛选条件的结果独立缓存，滚动回看已加载内容或切回原条件都不再重复请求。
 */
export function useDatasetOptions(keyword: string, size = DATASET_PAGE_SIZE) {
  const trimmed = keyword.trim()
  const categoryId = DATASET_CATEGORY_ORDER.find(
    (id) => DATASET_CATEGORY_LABELS[id] === trimmed,
  )
  const dataSetName =
    categoryId === undefined && trimmed !== '' ? trimmed : undefined
  const scopeKey =
    categoryId !== undefined
      ? `category:${categoryId}`
      : dataSetName !== undefined
        ? `name:${dataSetName}`
        : 'all'

  const [scopes, setScopes] = useState<ReadonlyMap<string, DatasetScopeState>>(
    () => new Map(),
  )
  // 已发出请求的「条件 + 页码」，避免滚动事件连发时重复拉同一页
  const pendingRef = useRef<Set<string>>(new Set())
  const current = scopes.get(scopeKey) ?? EMPTY_SCOPE

  // 第一页：进入筛选条件时加载，已加载过的条件直接复用缓存
  useEffect(() => {
    if (scopes.has(scopeKey)) return
    const controller = new AbortController()
    getDatasetPage(
      { current: 1, size, categoryId, dataSetName },
      controller.signal,
    )
      .then((page) => {
        setScopes((previous) =>
          updateScope(previous, scopeKey, (state) => ({
            ...state,
            datasets: page.records,
            total: Number(page.total),
            loadedPages: 1,
            error: null,
          })),
        )
      })
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
        if (controller.signal.aborted) return
        setScopes((previous) =>
          updateScope(previous, scopeKey, (state) => ({
            ...state,
            error: '数据集加载失败。',
          })),
        )
      })
    return () => controller.abort()
  }, [categoryId, dataSetName, scopeKey, scopes, size])

  /** 滚动到底部时加载下一页；正在加载或已取完时忽略 */
  function loadMore() {
    const state = scopes.get(scopeKey) ?? EMPTY_SCOPE
    if (state.isLoadingMore || state.loadedPages === 0) return
    if (state.datasets.length >= state.total) return
    const page = state.loadedPages + 1
    const requestKey = `${scopeKey}:${page}`
    if (pendingRef.current.has(requestKey)) return
    pendingRef.current.add(requestKey)
    setScopes((previous) =>
      updateScope(previous, scopeKey, (previousState) => ({
        ...previousState,
        isLoadingMore: true,
      })),
    )
    getDatasetPage({ current: page, size, categoryId, dataSetName })
      .then((result) => {
        setScopes((previous) =>
          updateScope(previous, scopeKey, (previousState) => ({
            ...previousState,
            datasets: [...previousState.datasets, ...result.records],
            total: Number(result.total),
            loadedPages: page,
            isLoadingMore: false,
          })),
        )
      })
      .catch(() => {
        // 失败不清空已加载内容，已加载内容仍在，滚动可再次触发重试
        setScopes((previous) =>
          updateScope(previous, scopeKey, (previousState) => ({
            ...previousState,
            isLoadingMore: false,
          })),
        )
      })
      .finally(() => {
        pendingRef.current.delete(requestKey)
      })
  }

  const ready = scopes.has(scopeKey)
  return {
    datasets: current.datasets,
    isLoading: !ready,
    isLoadingMore: current.isLoadingMore,
    hasMore: current.datasets.length < current.total,
    error: current.error,
    loadMore,
  }
}

/** 更新某个筛选条件的缓存，未命中时以空状态为基准 */
function updateScope(
  scopes: ReadonlyMap<string, DatasetScopeState>,
  scopeKey: string,
  update: (state: DatasetScopeState) => DatasetScopeState,
): ReadonlyMap<string, DatasetScopeState> {
  const next = new Map(scopes)
  next.set(scopeKey, update(scopes.get(scopeKey) ?? EMPTY_SCOPE))
  return next
}
