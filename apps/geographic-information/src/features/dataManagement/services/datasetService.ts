import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  DatasetCreateInput,
  DatasetPage,
  DatasetPageQuery,
  GeoDataset,
} from '../types/dataset'

/** 分页查询数据集，登录头由 httpClient 拦截器统一注入 */
export async function getDatasetPage(
  query: DatasetPageQuery,
  signal?: AbortSignal,
): Promise<DatasetPage> {
  const result = await httpClient.get<ApiResult<DatasetPage>>('/dataSet/page', {
    params: {
      current: query.current,
      size: query.size,
      ...(query.categoryId !== undefined
        ? { categoryId: query.categoryId }
        : {}),
      dataSetName: query.dataSetName ?? '0',
    },
    signal,
  })
  return result.data
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
