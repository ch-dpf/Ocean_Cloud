import { createHttpClient } from '@ocean-cloud/http'
export const httpClient = createHttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})
