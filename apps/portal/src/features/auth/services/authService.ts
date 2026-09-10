import { httpClient } from '../../../services/httpClient'
import type {
  LoginCredentials,
  LoginRequest,
  LoginResponse,
} from '../types/auth'
import { clearAuthSession, setAuthSession } from '../utils/authToken'
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

/** 退出登录：清理会话并跳回登录页 */
export function logout(): void {
  clearAuthSession()
  location.hash = `#${LOGIN_PATH}`
}

export function navigateAfterLogin(): void {
  location.hash = `#${HOME_PATH}`
}
