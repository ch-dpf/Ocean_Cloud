const TOKEN_KEY = 'token'
const USERNAME_KEY = 'username'

// 会话存 sessionStorage：关闭标签页/浏览器后清空，需重新登录
export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthSession(token: string, username: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(USERNAME_KEY, username)
  } catch {
    // 存储不可用时视为未登录
  }
}

export function clearAuthSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USERNAME_KEY)
  } catch {
    // 忽略存储异常
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken())
}
