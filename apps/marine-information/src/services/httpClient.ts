import { createHttpClient } from '@ocean-cloud/http'
export const httpClient = createHttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  // 生产环境与主平台同域，sessionStorage 中的 token 共享
  getAccessToken: () => sessionStorage.getItem('token'),
})
