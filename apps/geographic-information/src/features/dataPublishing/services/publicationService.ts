import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  AllPublicationPage,
  ImageryPublicationPage,
  PublicationPage,
  PublicationPageQuery,
} from '../types/publication'

/** 分页查询已发布的地形服务，登录头由 httpClient 拦截器统一注入 */
export async function getTerrainPublicationPage(
  query: PublicationPageQuery,
  signal?: AbortSignal,
): Promise<PublicationPage> {
  const result = await httpClient.get<ApiResult<PublicationPage>>(
    '/terrain-publications/page',
    {
      params: {
        current: query.current,
        size: query.size,
        ...(query.status ? { status: query.status } : {}),
        ...(query.serviceCode ? { serviceCode: query.serviceCode } : {}),
      },
      signal,
    },
  )
  return result.data
}

/** 分页查询已发布的影像服务，参数与地形一致（serviceCode/status 等） */
export async function getImageryPublicationPage(
  query: PublicationPageQuery,
  signal?: AbortSignal,
): Promise<ImageryPublicationPage> {
  const result = await httpClient.get<ApiResult<ImageryPublicationPage>>(
    '/imagery-publications/page',
    {
      params: {
        current: query.current,
        size: query.size,
        ...(query.status ? { status: query.status } : {}),
        ...(query.serviceCode ? { serviceCode: query.serviceCode } : {}),
      },
      signal,
    },
  )
  return result.data
}
/** 分页查询已发布的所有服务（地形+影像聚合），参数与地形一致（serviceCode/status 等） */
export async function getALLPublicationPage(
  query: PublicationPageQuery,
  signal?: AbortSignal,
): Promise<AllPublicationPage> {
  const result = await httpClient.get<ApiResult<AllPublicationPage>>(
    '/publications/page',
    {
      params: {
        current: query.current,
        size: query.size,
        ...(query.status ? { status: query.status } : {}),
        ...(query.serviceCode ? { serviceCode: query.serviceCode } : {}),
      },
      signal,
    },
  )
  return result.data
}

/** 发布已完成的地形处理任务：sourceTaskId 即任务 id，接口只需路径参数 */
export async function publishTerrainFromTask(taskId: string): Promise<void> {
  await httpClient.post<ApiResult<unknown>>(
    '/terrain-publications/' + encodeURIComponent(taskId) + '/publish',
  )
}

/** 发布已完成的影像处理任务：sourceTaskId 即任务 id，接口只需路径参数 */
export async function publishImageryFromTask(taskId: string): Promise<void> {
  await httpClient.post<ApiResult<unknown>>(
    '/imagery-publications/' + encodeURIComponent(taskId) + '/publish',
  )
}
