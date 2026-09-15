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
