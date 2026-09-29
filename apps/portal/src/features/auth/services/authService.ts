import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type { CurrentUser } from '@ocean-cloud/ui'
import type {
  LoginCredentials,
  LoginRequest,
  LoginResponse,
} from '../types/auth'
import {
  clearAuthSession,
  getAuthToken,
  setAuthSession,
} from '../utils/authToken'
import { getClientLoginMeta, getOrCreateDeviceId } from '../utils/clientMeta'
import { HOME_PATH, LOGIN_PATH } from '../constants'

/**
 * 登录：向 /api/auth/login 发起真实请求。
 * 请求体包含 platform/deviceId/browser/os/userAgent，与后端契约一致。
 * 成功后只把 token + username 存入 sessionStorage（关闭浏览器即失效）。
 * role/roleType/platform 不持久化。
 */
export async function login(credentials: LoginCredentials): Promise<void> {
  const deviceId = getOrCreateDeviceId()
  const clientMeta = getClientLoginMeta()

  const requestBody: LoginRequest = {
    username: credentials.username,
    password: credentials.password,
    platform: 'OCEAN_CLOUD',
    deviceId,
    ...clientMeta,
    // 强制登录：确认启用后取消注释
    forceLogin: credentials.forceLogin,
  }

  const response = await httpClient.post<LoginResponse>(
    '/auth/login',
    requestBody,
  )

  if (response.code !== 200 || !response.data) {
    throw new Error(response.message || '登录失败')
  }

  const { token, username } = response.data
  setAuthSession(token, username)
}

/** 退出登录：通知后端使 token 失效，清理会话并跳回登录页 */
export async function logout(): Promise<void> {
  try {
    const token = getAuthToken()
    await httpClient.post('/auth/logout', { token })
  } catch {
    // 后端登出失败也继续本地清理
  } finally {
    clearAuthSession()
    location.hash = `#${LOGIN_PATH}`
  }
}

/**
 * 查询当前登录用户信息：Authorization 头由 httpClient 拦截器统一注入。
 * 返回值只取界面需要的字段，后端多返回的密码、失败次数等不会被使用。
 */
export async function getUserInfo(signal: AbortSignal): Promise<CurrentUser> {
  const result = await httpClient.get<ApiResult<CurrentUser>>('/auth/info', {
    signal,
  })
  return result.data
}

export function navigateAfterLogin(): void {
  location.hash = `#${HOME_PATH}`
}
