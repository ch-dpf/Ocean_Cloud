import { httpClient } from '../../services/httpClient'
import type { ApiResult } from '../../services/apiResult'
import type { CurrentUser } from '@ocean-cloud/ui'

/** 查询当前登录用户信息：Authorization 头由 httpClient 拦截器统一注入 */
export async function getUserInfo(signal: AbortSignal): Promise<CurrentUser> {
  const result = await httpClient.get<ApiResult<CurrentUser>>('/auth/info', {
    signal,
  })
  return result.data
}
