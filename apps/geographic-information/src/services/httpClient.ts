import { createHttpClient } from '@ocean-cloud/http'
/** 后端基地址：与实例的 baseURL 同源，供 <a> 直接下载等走不了封装的场景复用 */
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/gis'
export const httpClient = createHttpClient({
  baseURL: apiBaseUrl,
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
  // 临时调试：收到响应（或失败）时打印方法、路径、状态码与耗时，
  // 用于区分「后端响应慢」还是「前端渲染/主线程慢」。定位完成后可删除。
  onResponse: ({ method, url, status, durationMs }) => {
    if (!import.meta.env.DEV) return
    console.info(`[http] ${method} ${url} ${status} ${durationMs}ms`)
  },
})
