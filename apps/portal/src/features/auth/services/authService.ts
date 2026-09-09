import type { AuthSession, LoginCredentials } from '../types/auth'
import { clearAuthSession, setAuthSession } from '../utils/authToken'
import { HOME_PATH, LOGIN_PATH } from '../constants'

/**
 * 登录：暂不鉴权，输入账号密码即建立本地会话。
 * 后端 /auth/login 就绪后，替换为 httpClient.post('/auth/login', credentials) 并以其返回的 token 为准。
 */
export function login(credentials: LoginCredentials): AuthSession {
  const session: AuthSession = {
    token: `local-${Date.now()}`,
    username: credentials.username,
  }
  setAuthSession(session.token, session.username)
  return session
}

/** 退出登录：清理会话并跳回登录页 */
export function logout(): void {
  clearAuthSession()
  location.hash = `#${LOGIN_PATH}`
}

export function navigateAfterLogin(): void {
  location.hash = `#${HOME_PATH}`
}
