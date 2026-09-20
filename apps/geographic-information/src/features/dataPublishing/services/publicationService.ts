import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
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
