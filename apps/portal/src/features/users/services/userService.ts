import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type { MemberUserPage } from '../types/user'

/** 分页查询平台用户，登录头由 httpClient 拦截器统一注入 */
export async function getUserPage(
  query: { readonly current: number; readonly size: number },
  signal?: AbortSignal,
): Promise<MemberUserPage> {
  const result = await httpClient.get<ApiResult<MemberUserPage>>(
    '/member/user/query',
    { params: { current: query.current, size: query.size }, signal },
  )
  return result.data
}
