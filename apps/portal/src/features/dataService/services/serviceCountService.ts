import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type { PageTotal } from '../types/serviceCount'

/**
 * 分页接口只取 total 做计数：size=1 是最轻的计数请求。
 * 主平台 httpClient 的 baseURL 是 /api，业务接口在 /api/gis 下，因此路径带上 /gis 前缀。
 * total 为空或不是有效数字时返回 null，由调用方保持占位显示。
 */
async function getPageTotal(
  url: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const result = await httpClient.get<ApiResult<PageTotal>>(url, {
    params: { current: 1, size: 1 },
    signal,
  })
  const total = Number(result.data?.total)
  return Number.isFinite(total) ? total : null
}

/** 数据集数量 */
export function getDatasetTotal(signal?: AbortSignal): Promise<number | null> {
  return getPageTotal('/gis/dataSet/page', signal)
}

/** 任务数量：不按任务类型过滤，统计全部任务 */
export function getTaskTotal(signal?: AbortSignal): Promise<number | null> {
  return getPageTotal('/gis/task/page', signal)
}

/** 已发布服务数量 */
export function getPublicationTotal(
  signal?: AbortSignal,
): Promise<number | null> {
  return getPageTotal('/gis/publications/page', signal)
}
