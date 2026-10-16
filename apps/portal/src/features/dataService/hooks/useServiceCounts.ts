import { useEffect, useState } from 'react'
import {
  getDatasetTotal,
  getPublicationTotal,
  getTaskTotal,
} from '../services/serviceCountService'

export interface ServiceCounts {
  /** 数据集数量 */
  readonly datasetTotal: number | null
  /** 全部任务数量 */
  readonly taskTotal: number | null
  /** 已发布服务数量 */
  readonly publicationTotal: number | null
}

const EMPTY_COUNTS: ServiceCounts = {
  datasetTotal: null,
  taskTotal: null,
  publicationTotal: null,
}

/**
 * 数据服务页的计数：三个分页接口只取 total，页面加载时请求一次。
 * 单个接口失败只让该项保持占位，不影响其它计数；错误提示由 RequestErrorNotice 统一展示。
 */
export function useServiceCounts(): ServiceCounts {
  const [counts, setCounts] = useState<ServiceCounts>(EMPTY_COUNTS)

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    Promise.all([
      getDatasetTotal(signal).catch(() => null),
      getTaskTotal(signal).catch(() => null),
      getPublicationTotal(signal).catch(() => null),
    ]).then(([datasetTotal, taskTotal, publicationTotal]) => {
      setCounts({ datasetTotal, taskTotal, publicationTotal })
    })
    return () => controller.abort()
  }, [])

  return counts
}
