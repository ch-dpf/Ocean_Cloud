import { useEffect, useMemo, useState } from 'react'
import { getAllDatasets } from '../services/datasetService'
import type { GeoDataset } from '../types/dataset'

export interface DatasetCategoryEntry {
  /** 该分类的数据集个数 */
  readonly total: number
  /** 该分类下的全部数据集，用于侧边栏展开选择 */
  readonly datasets: readonly GeoDataset[]
}

/** 数据集分类目录：一次取回全量数据集，按 categoryId 分组统计 */
export function useDatasetCatalog() {
  const [result, setResult] = useState<{
    readonly revision: number
    readonly datasets: readonly GeoDataset[]
  }>({ revision: -1, datasets: [] })
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getAllDatasets(controller.signal)
      .then((datasets) => setResult({ revision, datasets }))
      .catch(() => {
        // 主动取消不提示；其余错误同时由 RequestErrorNotice 统一展示
      })
    return () => controller.abort()
  }, [revision])

  const catalog = useMemo(() => groupByCategory(result.datasets), [result])

  /** 重新读取目录，用于新增数据集后刷新 */
  function refresh() {
    setRevision((previous) => previous + 1)
  }

  return {
    /** 全量数据集，导入弹窗的候选列表同样用它本地筛选 */
    datasets: result.datasets,
    catalog,
    isLoading: result.revision !== revision,
    refresh,
  }
}

/** 按 categoryId 分组，组内保持接口返回顺序 */
function groupByCategory(
  datasets: readonly GeoDataset[],
): Readonly<Record<number, DatasetCategoryEntry | undefined>> {
  const grouped: Record<number, { total: number; datasets: GeoDataset[] }> = {}
  for (const dataset of datasets) {
    const categoryId = Number(dataset.categoryId)
    const entry = grouped[categoryId] ?? { total: 0, datasets: [] }
    entry.datasets.push(dataset)
    entry.total += 1
    grouped[categoryId] = entry
  }
  return grouped
}
