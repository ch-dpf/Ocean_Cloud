import { useEffect, useState } from 'react'
import { FILE_PAGE_SIZE } from '../constants/dataset'
import {
  getDeletedFileMetaPage,
  getFileMetaPage,
} from '../services/fileMetaService'
import type { FileMeta, FileMetaFilters, FileScope } from '../types/fileMeta'

interface FileMetaPageData {
  /** 结果对应的查询范围，用于判断是否仍是当前查询的结果 */
  readonly key: string
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

/**
 * 分页查询数据文件。范围为空时不发起请求；切换范围、筛选条件或每页条数回到第一页；
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 */
export function useFileMetaPage(
  scope: FileScope | null,
  filters: FileMetaFilters = {},
  size = FILE_PAGE_SIZE,
) {
  const scopeKey = scopeKeyOf(scope)
  const dataSetId =
    scope !== null && scope.kind === 'dataset' ? scope.dataSetId : undefined
  const categoryId =
    scope !== null && scope.kind === 'category' ? scope.categoryId : undefined
  // 回收站走独立的已删除接口，只传 current / size，筛选条件不参与查询
  const isRecycleBin = scope !== null && scope.kind === 'recycleBin'
  const { originalName = '', extension = '' } = filters
  const filterKey = isRecycleBin ? '' : `${originalName}\u0000${extension}`
  const [paging, setPaging] = useState({
    scopeKey,
    filterKey,
    size,
    current: 1,
  })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<FileMetaPageData | null>(null)
  // 切换范围、筛选条件或每页条数时直接按第一页查询，不必先按旧页码多打一次请求
  const current =
    paging.scopeKey === scopeKey &&
    paging.filterKey === filterKey &&
    paging.size === size
      ? paging.current
      : 1
  const queryKey =
    scopeKey === null
      ? null
      : `${scopeKey}:${filterKey}:${current}:${size}:${revision}`

  useEffect(() => {
    if (queryKey === null) return
    const controller = new AbortController()
    const request = isRecycleBin
      ? getDeletedFileMetaPage({ current, size }, controller.signal)
      : getFileMetaPage(
          { current, size, dataSetId, categoryId, originalName, extension },
          controller.signal,
        )
    request
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
          error: '数据加载失败。',
        })
      })
    return () => controller.abort()
  }, [
    categoryId,
    current,
    dataSetId,
    extension,
    filterKey,
    isRecycleBin,
    originalName,
    queryKey,
    scopeKey,
    size,
  ])

  function goToPage(next: number) {
    setPaging({ scopeKey, filterKey, size, current: next })
  }

  /** 重新查询当前条件，用于导入、删除等写操作后刷新 */
  function refresh() {
    setRevision((previous) => previous + 1)
  }

  const ready = data !== null && data.key === queryKey
  return {
    records: ready ? data.records : [],
    total: ready ? data.total : 0,
    error: ready ? data.error : null,
    isLoading: queryKey !== null && !ready,
    current,
    goToPage,
    refresh,
  }
}
