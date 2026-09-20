import { RequestError } from '@ocean-cloud/http'
import { httpClient } from '../../services/httpClient'
import type { ApiResult } from '../../services/apiResult'
import { PORTAL_ORIGIN } from '../../config/application'

/**
 * 校验当前 token 是否仍然有效。
 * 后端契约：HTTP 2xx 即请求成功，再按响应体的 data 判定。
 * 只有明确失效（data 不为 true）与 HTTP 401 才返回 false；
 * 网络、超时、5xx 等无法判定的情况返回 true，避免把用户误踢到登录页。
 */
export async function validateToken(signal: AbortSignal): Promise<boolean> {
  const token = sessionStorage.getItem('token')
  if (token === null || token === '') return false
  try {
    const result = await httpClient.post<ApiResult<boolean>>(
      '/api/auth/validate-token',
      { token },
      // 鉴权接口不在业务前缀 /api/gis 下，这里覆盖实例的 baseURL
      { baseURL: '', signal },
    )
    return result.data === true
  } catch (error) {
    return !(error instanceof RequestError && error.kind === 'unauthorized')
  }
}

/** token 失效：清理本地会话并跳回主平台登录页 */
export function redirectToLogin(): void {
  try {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('username')
  } catch {
    // 忽略存储异常
  }
  window.location.href = `${PORTAL_ORIGIN.replace(/\/$/, '')}/#/login`
}
