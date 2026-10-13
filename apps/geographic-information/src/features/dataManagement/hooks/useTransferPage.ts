import { useEffect, useState } from 'react'
import { TRANSFER_PAGE_SIZE } from '../constants/dataset'
import { getTransferPage } from '../services/fileTransferService'
import type { TransferFilters, TransferRecord } from '../types/fileTransfer'

interface TransferPageData {
  /** 结果对应的查询条件，用于判断是否仍是当前查询的结果 */
  readonly key: string
  readonly records: readonly TransferRecord[]
  readonly total: number
  readonly error: string | null
}

/**
 * 传输记录分页查询。筛选条件或每页条数变化时回到第一页；
 * 条件变化时取消上一次请求，并只在结果对应当前查询时才展示。
 * enabled 由调用方按当前栏目传入：切到传输记录时它会变化，从而无条件重新查询一次。
 */
export function useTransferPage(
  filters: TransferFilters = {},
  size = TRANSFER_PAGE_SIZE,
  enabled = true,
) {
  const {
    dataSetId,
    categoryId,
    recordNo,
    operationType,
    recordStatus,
    originalName,
    extension,
    uploadStatus,
    createTimeStart,
    createTimeEnd,
  } = filters
  const filterKey = [
    dataSetId ?? '',
    categoryId ?? '',
    recordNo ?? '',
    operationType ?? '',
    recordStatus ?? '',
    originalName ?? '',
    extension ?? '',
    uploadStatus ?? '',
    createTimeStart ?? '',
    createTimeEnd ?? '',
  ].join('\u0000')
  const [paging, setPaging] = useState({ filterKey, size, current: 1 })
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<TransferPageData | null>(null)
  // 条件或每页条数变化时直接按第一页查询，不必先按旧页码多打一次请求
  const current =
    paging.filterKey === filterKey && paging.size === size ? paging.current : 1
  // 不在传输记录栏目时 key 为 null：不请求、也不把上一次的结果当成当前结果展示
  const queryKey = enabled
    ? `${filterKey}:${current}:${size}:${revision}`
    : null

  useEffect(() => {
    if (queryKey === null) return
    const controller = new AbortController()
    getTransferPage(
      {
        current,
        size,
        dataSetId,
        categoryId,
        recordNo,
        operationType,
        recordStatus,
        originalName,
        extension,
        uploadStatus,
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
          error: '传输记录加载失败。',
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
    operationType,
    originalName,
    queryKey,
    recordNo,
    recordStatus,
    size,
    uploadStatus,
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
