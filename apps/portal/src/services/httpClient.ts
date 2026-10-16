import { createHttpClient } from '@ocean-cloud/http'
import {
  clearAuthSession,
  getAuthToken,
} from '../features/auth/utils/authToken'
import { LOGIN_PATH } from '../features/auth/constants'

export const httpClient = createHttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  // 每次请求前读取 token，注入 Authorization 头
  getAccessToken: getAuthToken,
})

// 401：会话失效，清理后回登录页
httpClient.onStatus(401, () => {
  clearAuthSession()
  location.hash = `#${LOGIN_PATH}`
})
