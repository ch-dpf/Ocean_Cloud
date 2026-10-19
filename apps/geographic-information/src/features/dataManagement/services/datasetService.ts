import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import { FOOTPRINT_SIMPLIFY_TOLERANCE } from '../constants/dataset'
import type {
  DatasetCreateInput,
  DatasetFootprints,
  DatasetPageQuery,
  DatasetUpdateInput,
  GeoDataset,
  GeoDatasetPage,
} from '../types/dataset'

/**
 * 查询全部数据集：不分页、不分类，一次取回。
 * 分类统计与筛选都在前端完成，登录头由 httpClient 拦截器统一注入。
 */
export async function getAllDatasets(
  signal?: AbortSignal,
): Promise<readonly GeoDataset[]> {
  const result = await httpClient.get<ApiResult<readonly GeoDataset[]>>(
    '/dataSet/query',
    { signal },
  )
  return result.data
}

/**
 * 分页查询数据集：dataSetName 为名称模糊匹配关键字，为空时不提交该参数。
 * 轮廓由 /dataSet/{id}/footprints 按需单独取，这里不预取；
 * 登录头由 httpClient 拦截器统一注入。
 */
export async function getDatasetPage(
  query: DatasetPageQuery,
  signal?: AbortSignal,
): Promise<GeoDatasetPage> {
  const result = await httpClient.get<ApiResult<GeoDatasetPage>>(
    '/dataSet/page',
    {
      params: {
        current: query.current,
        size: query.size,
        ...(query.categoryId === undefined
          ? {}
          : { categoryId: query.categoryId }),
        ...(query.dataSetName === undefined || query.dataSetName === ''
          ? {}
          : { dataSetName: query.dataSetName }),
      },
      signal,
    },
  )
  return result.data
}

/**
 * 按需取某个数据集的轮廓：GET /dataSet/{id}/footprints，
 * 响应体的 data 是一条完整的数据集记录，轮廓在它的 footprints 字段里（GeoJSON FeatureCollection）。
 * simplifyTolerance 按后端要求传 0：详情要看完整范围，不做简化；未返回轮廓时返回 null。
 */
export async function fetchDatasetFootprints(
  dataSetId: string,
  signal?: AbortSignal,
): Promise<DatasetFootprints | null> {
  const result = await httpClient.get<
    ApiResult<GeoDataset & { readonly footprints?: DatasetFootprints | null }>
  >(`/dataSet/${encodeURIComponent(dataSetId)}/footprints`, {
    params: { simplifyTolerance: FOOTPRINT_SIMPLIFY_TOLERANCE },
    signal,
  })
  return result.data.footprints ?? null
}

/** 新增数据集，记录 id 由后端生成，因此请求体不传 id */
export async function createDataset(
  input: DatasetCreateInput,
): Promise<GeoDataset> {
  const result = await httpClient.post<ApiResult<GeoDataset>>(
    '/dataSet/create',
    {
      dataSetName: input.dataSetName,
      categoryId: input.categoryId,
      description: input.description,
    },
  )
  return result.data
}

/**
 * 手工拼 update 的 JSON 文本：id 要按不带引号的数字发出，但它超出 JS 安全整数范围
 * （如 2099397083204587522），转 Number 会改写末位，因此直接把原字符串写进 JSON；
 * id 不是纯数字时退回带引号的字符串，保证 body 始终是合法 JSON。
 */
function serializeDatasetUpdate(input: DatasetUpdateInput): string {
  const id = /^\d+$/.test(input.id) ? input.id : JSON.stringify(input.id)
  const name = JSON.stringify(input.dataSetName)
  const description = JSON.stringify(input.description)
  return `{"id":${id},"dataSetName":${name},"categoryId":${input.categoryId},"description":${description}}`
}

/** 修改数据集名称与描述；分类按原值回传，后端暂不接受变更 */
export async function updateDataset(input: DatasetUpdateInput): Promise<void> {
  await httpClient.put<ApiResult<unknown>>(
    '/dataSet/update',
    serializeDatasetUpdate(input),
    { headers: { 'Content-Type': 'application/json' } },
  )
}

/** 删除数据集 */
export async function deleteDataset(id: string): Promise<void> {
  await httpClient.delete<ApiResult<unknown>>(
    '/dataSet/' + encodeURIComponent(id),
  )
}
