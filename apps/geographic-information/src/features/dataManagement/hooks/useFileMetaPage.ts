import { useEffect, useState } from 'react'
import { FILE_PAGE_SIZE } from '../constants/dataset'
import {
  getDeletedFileMetaPage,
  getFileMetaPage,
} from '../services/fileMetaService'
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
  if (scope.kind === 'recycleBin') return 'recycle-bin'
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
  // 回收站走独立的已删除接口，只传 current / size
  const isRecycleBin = scope !== null && scope.kind === 'recycleBin'
  const [paging, setPaging] = useState({ scopeKey, size, current: 1 })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<FileMetaPageData | null>(null)
  // 全部数据的总条数：范围为全部时随列表请求带回，切换范围后仍可供侧边栏计数使用
  const [allTotal, setAllTotal] = useState<number | null>(null)
  const [allRevision, setAllRevision] = useState(0)
  // 切换范围或每页条数时直接按第一页查询，不必先按旧页码多打一次请求
  const current =
    paging.scopeKey === scopeKey && paging.size === size ? paging.current : 1
  const queryKey =
    scopeKey === null ? null : `${scopeKey}:${current}:${size}:${revision}`

  useEffect(() => {
    if (queryKey === null) return
    const controller = new AbortController()
    const request = isRecycleBin
      ? getDeletedFileMetaPage({ current, size }, controller.signal)
      : getFileMetaPage(
          { current, size, dataSetId, categoryId },
          controller.signal,
        )
    request
      .then((page) => {
        const total = Number(page.total)
        if (scopeKey === 'all') setAllTotal(total)
        setData({
          key: queryKey,
          records: page.records,
          total,
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
  }, [categoryId, current, dataSetId, isRecycleBin, queryKey, scopeKey, size])

  /**
   * 非「全部数据」范围下的全量条数重取：列表请求带不回全量条数，
   * 因此在写操作后（删除、上传完成）补一次只取 total 的请求。
   * allRevision 初始为 0，进页面时不发这次请求。
   */
  useEffect(() => {
    if (allRevision === 0) return
    const controller = new AbortController()
    getFileMetaPage({ current: 1, size: 1 }, controller.signal)
      .then((page) => {
        setAllTotal(Number(page.total))
      })
      .catch(() => {
        // 失败保留上一次的计数；其余错误同时由 RequestErrorNotice 统一展示
      })
    return () => controller.abort()
  }, [allRevision])

  function goToPage(next: number) {
    setPaging({ scopeKey, size, current: next })
  }

  /** 重新查询当前条件，用于导入、删除等写操作后刷新 */
  function refresh() {
    setRevision((previous) => previous + 1)
    // 「全部数据」范围下列表请求已带回全量条数，无需再取一次
    if (scopeKey !== 'all') setAllRevision((previous) => previous + 1)
  }

  const ready = data !== null && data.key === queryKey
  return {
    records: ready ? data.records : [],
    total: ready ? data.total : 0,
    /** 全部数据的总条数（数据个数），与当前范围无关 */
    allTotal,
    error: ready ? data.error : null,
    isLoading: queryKey !== null && !ready,
    current,
    goToPage,
    refresh,
  }
}
