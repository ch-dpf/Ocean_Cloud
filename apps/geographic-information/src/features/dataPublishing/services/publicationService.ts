import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  Publication,
  PublicationPage,
  PublicationPageQuery,
  PublicationProcessingType,
} from '../types/publication'

/** 分页查询 GIS 发布记录；processingType 为空时查询全部类型。 */
export async function getPublicationPage(
  query: PublicationPageQuery,
  signal?: AbortSignal,
): Promise<PublicationPage> {
  const result = await httpClient.get<ApiResult<PublicationPage>>(
    '/publications/page',
    {
      params: {
        current: query.current,
        size: query.size,
        ...(query.processingType
          ? { processingType: query.processingType }
          : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.serviceCode ? { serviceCode: query.serviceCode } : {}),
      },
      signal,
    },
  )
  return result.data
}

/** 发布已完成的瓦片处理任务。 */
export async function publishFromTask(
  processingType: PublicationProcessingType,
  taskId: string,
): Promise<Publication> {
  const result = await httpClient.post<ApiResult<Publication>>(
    '/publications/' +
      encodeURIComponent(processingType) +
      '/' +
      encodeURIComponent(taskId) +
      '/publish',
  )
  return result.data
}

/** 停用已发布的 GIS 服务；路径参数是 serviceCode。 */
export async function disablePublication(
  processingType: PublicationProcessingType,
  serviceCode: string,
): Promise<Publication> {
  const result = await httpClient.put<ApiResult<Publication>>(
    '/publications/' +
      encodeURIComponent(processingType) +
      '/' +
      encodeURIComponent(serviceCode) +
      '/disable',
  )
  return result.data
}
