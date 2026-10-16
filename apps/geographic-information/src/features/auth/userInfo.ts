import { httpClient } from '../../services/httpClient'
import type { ApiResult } from '../../services/apiResult'
import type { CurrentUser } from '@ocean-cloud/ui'

/**
 * 查询当前登录用户信息：Authorization 头由 httpClient 拦截器统一注入。
 * 鉴权接口不在业务前缀 /api/gis 下，这里覆盖实例的 baseURL。
 */
export async function getUserInfo(signal: AbortSignal): Promise<CurrentUser> {
  const result = await httpClient.get<ApiResult<CurrentUser>>(
    '/api/auth/info',
    { baseURL: '', signal },
  )
  return result.data
}
