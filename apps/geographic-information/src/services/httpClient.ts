import { createHttpClient } from '@ocean-cloud/http'
export const httpClient = createHttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/gis',
  // 生产环境与主平台同域，sessionStorage 中的 token 共享
  getAccessToken: () => sessionStorage.getItem('token'),
  // 业务接口统一响应体：code 200 为成功，其余按业务错误处理
  parseBusinessError(payload) {
    if (!payload || typeof payload !== 'object' || !('code' in payload))
      return null
    const result = payload as {
      readonly code: unknown
      readonly message?: unknown
    }
    if (result.code === 200) return null
    if (typeof result.code !== 'string' && typeof result.code !== 'number')
      return null
    return {
      code: result.code,
      message:
        typeof result.message === 'string' && result.message
          ? result.message
          : '请求失败。',
    }
  },
})
