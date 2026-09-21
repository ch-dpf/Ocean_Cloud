import { useEffect, useState } from 'react'
import { FILE_OPT_PAGE_SIZE } from '../constants/dataset'
import { getFileOptPage } from '../services/fileOptService'
import type { FileOptFilters, FileOptRecord } from '../types/fileOpt'

interface FileOptPageData {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly records: readonly FileOptRecord[]
  readonly total: number
  readonly error: string | null
}

/**
 * 文件操作记录（导入记录）分页查询。筛选条件或每页条数变化时回到第一页；
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 * enabled 由调用方按当前栏目传入：切到导入记录时它会变化，从而无条件重新查询一次。
 */
export function useFileOptPage(
  filters: FileOptFilters = {},
  size = FILE_OPT_PAGE_SIZE,
  enabled = true,
) {
  const {
    dataSetId,
    categoryId,
    recordNo,
    recordStatus,
    originalName,
    extension,
    createTimeStart,
    createTimeEnd,
  } = filters
  const filterKey = [
    dataSetId ?? '',
    categoryId ?? '',
    recordNo ?? '',
    recordStatus ?? '',
    originalName ?? '',
    extension ?? '',
    createTimeStart ?? '',
    createTimeEnd ?? '',
  ].join('\u0000')
  const [paging, setPaging] = useState({ filterKey, size, current: 1 })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<FileOptPageData | null>(null)
  // 条件或每页条数变化时直接按第一页查询，不必先按旧页码多打一次请求
  const current =
    paging.filterKey === filterKey && paging.size === size ? paging.current : 1
  // 不在导入记录栏目时 key 为 null：不请求、也不把上一次的结果当成当前结果展示
  const queryKey = enabled
    ? `${filterKey}:${current}:${size}:${revision}`
    : null

  useEffect(() => {
    if (queryKey === null) return
    const controller = new AbortController()
    getFileOptPage(
      {
        current,
        size,
        dataSetId,
        categoryId,
        recordNo,
        recordStatus,
        originalName,
        extension,
        createTimeStart,
        createTimeEnd,
      },
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
          error: '导入记录加载失败。',
        })
      })
    return () => controller.abort()
  }, [
    categoryId,
    createTimeEnd,
    createTimeStart,
    current,
    dataSetId,
    extension,
    filterKey,
    originalName,
    queryKey,
    recordNo,
    recordStatus,
    size,
  ])

  const ready = data !== null && data.key === queryKey
  return {
    records: ready ? data.records : [],
    total: ready ? data.total : 0,
    current,
    error: ready ? data.error : null,
    isLoading: !ready,
    goToPage: (next: number) => setPaging({ filterKey, size, current: next }),
    /** 按当前条件重新查询 */
    refresh: () => setRevision((previous) => previous + 1),
  }
}
