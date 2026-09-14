import { useEffect, useState } from 'react'
import { DATASET_CATEGORY_ORDER, DATASET_PAGE_SIZE } from '../constants/dataset'
import { getDatasetPage } from '../services/datasetService'
import type { GeoDataset } from '../types/dataset'

export interface DatasetCategoryEntry {
  /** 该分类的数据集总数 */
  readonly total: number
  /** 该分类下当前已加载的数据集，用于侧边栏展开选择 */
  readonly datasets: readonly GeoDataset[]
}

/** 各分类的数据集目录：总数与数据集名称，一次请求同时取得 */
export function useDatasetCatalog() {
  const [catalog, setCatalog] = useState<
    Readonly<Record<number, DatasetCategoryEntry | undefined>>
  >({})
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all(
      DATASET_CATEGORY_ORDER.map((categoryId) =>
        getDatasetPage(
          { current: 1, size: DATASET_PAGE_SIZE, categoryId },
          controller.signal,
        ).then(
          (page) =>
            [
              categoryId,
              { total: Number(page.total), datasets: page.records },
            ] as const,
        ),
      ),
    )
      .then((entries) => {
        setCatalog(Object.fromEntries(entries))
      })
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
      })
    return () => controller.abort()
  }, [revision])

  /** 重新读取目录，用于新增数据集后刷新 */
  function refresh() {
    setRevision((previous) => previous + 1)
  }

  return { catalog, refresh }
}
