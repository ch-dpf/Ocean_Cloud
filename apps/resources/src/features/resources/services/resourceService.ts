import { httpClient } from '../../../services/httpClient'
import type { ResourceRecord } from '../types/resource'
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false'
export function listResources(signal?: AbortSignal) {
  return httpClient.get<ResourceRecord[]>(
    USE_MOCK_DATA ? '/mock/resources.json' : '/resources',
    { signal, ...(USE_MOCK_DATA ? { baseURL: '' } : {}) },
  )
}
