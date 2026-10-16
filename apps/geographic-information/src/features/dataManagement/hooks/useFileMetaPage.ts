import { useCallback, useEffect, useState } from 'react'
import { FILE_PAGE_SIZE } from '../constants/dataset'
import {
  getDeletedFileMetaPage,
  getFileMetaPage,
} from '../services/fileMetaService'
import type { FileMeta, FileMetaFilters, FileScope } from '../types/fileMeta'

interface FileMetaPageData {
  readonly key: string
  readonly viewKey: string
  readonly records: readonly FileMeta[]
  readonly total: number
  readonly error: string | null
}

function scopeKeyOf(scope: FileScope | null): string | null {
  if (scope === null) return null
  if (scope.kind === 'all') return 'all'
  if (scope.kind === 'category') return `category:${scope.categoryId}`
  if (scope.kind === 'recycleBin') return 'recycle-bin'
  return `dataset:${scope.dataSetId}`
}

/** 全部数据与回收站共用筛选契约，查询变化时回到首页并取消旧请求。 */
export function useFileMetaPage(
  scope: FileScope | null,
  filters: FileMetaFilters = {},
  size = FILE_PAGE_SIZE,
) {
  const scopeKey = scopeKeyOf(scope)
  const dataSetId = scope?.kind === 'dataset' ? scope.dataSetId : undefined
  const categoryId = scope?.kind === 'category' ? scope.categoryId : undefined
  const isRecycleBin = scope?.kind === 'recycleBin'
  const filterKey = JSON.stringify(filters)
  const [paging, setPaging] = useState({
    scopeKey,
    filterKey,
    size,
    current: 1,
  })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<FileMetaPageData | null>(null)
  const current =
    paging.scopeKey === scopeKey &&
    paging.filterKey === filterKey &&
    paging.size === size
      ? paging.current
      : 1
  const viewKey = JSON.stringify([scopeKey, filterKey, current, size])
  const queryKey =
    scopeKey === null
      ? null
      : JSON.stringify([scopeKey, filterKey, current, size, revision])

  useEffect(() => {
    if (queryKey === null) return
    const controller = new AbortController()
    const query = {
      ...(JSON.parse(filterKey) as FileMetaFilters),
      current,
      size,
      dataSetId,
      categoryId,
    }
    const request = isRecycleBin
      ? getDeletedFileMetaPage(query, controller.signal)
      : getFileMetaPage(query, controller.signal)
    request
      .then((page) => {
        if (controller.signal.aborted) return
        setData({
          key: queryKey,
          viewKey,
          records: page.records,
          total: Number(page.total),
          error: null,
        })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setData({
          key: queryKey,
          viewKey,
          records: [],
          total: 0,
          error: '数据加载失败。',
        })
      })
    return () => controller.abort()
  }, [
    categoryId,
    current,
    dataSetId,
    filterKey,
    isRecycleBin,
    queryKey,
    size,
    viewKey,
  ])

  const refresh = useCallback(
    () => setRevision((previous) => previous + 1),
    [setRevision],
  )
  const sameView = data !== null && data.viewKey === viewKey
  const ready = sameView && data.key === queryKey
  return {
    records: sameView ? data.records : [],
    total: sameView ? data.total : 0,
    error: ready ? data.error : null,
    isLoading: queryKey !== null && !ready,
    current,
    goToPage: (next: number) =>
      setPaging({ scopeKey, filterKey, size, current: next }),
    refresh,
  }
}
