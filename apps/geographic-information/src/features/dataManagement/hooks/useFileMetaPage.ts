import { useEffect, useState } from 'react'
import { FILE_PAGE_SIZE } from '../constants/dataset'
import { getFileMetaPage } from '../services/fileMetaService'
import type { FileMeta, FileScope } from '../types/fileMeta'

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
  return `dataset:${scope.dataSetId}`
}

/**
 * 分页查询数据文件。范围为空时不发起请求；切换范围回到第一页；
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 */
export function useFileMetaPage(
  scope: FileScope | null,
  size = FILE_PAGE_SIZE,
) {
  const scopeKey = scopeKeyOf(scope)
  const dataSetId =
    scope !== null && scope.kind === 'dataset' ? scope.dataSetId : undefined
  const categoryId =
    scope !== null && scope.kind === 'category' ? scope.categoryId : undefined
  const [paging, setPaging] = useState({ scopeKey, current: 1 })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<FileMetaPageData | null>(null)
  // 切换范围时直接按第一页查询，不必先按旧页码多打一次请求
  const current = paging.scopeKey === scopeKey ? paging.current : 1
  const queryKey =
    scopeKey === null ? null : `${scopeKey}:${current}:${size}:${revision}`

  useEffect(() => {
    if (queryKey === null) return
    const controller = new AbortController()
    getFileMetaPage({ current, size, dataSetId, categoryId }, controller.signal)
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
  }, [categoryId, current, dataSetId, queryKey, size])

  function goToPage(next: number) {
    setPaging({ scopeKey, current: next })
  }

  /** 重新查询当前条件，用于导入等写操作后刷新 */
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
