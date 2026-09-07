import { httpClient } from '../../../services/httpClient'
import type {
  ApplicationDetail,
  ApplicationInput,
  ApplicationTask,
  MicroApplication,
} from '../../../types/application'
const requestHeaders = { 'X-Ocean-Client': 'portal' }
export function listDeletedApplications(signal?: AbortSignal) {
  return httpClient.get<MicroApplication[]>('/deleted-applications', {
    signal,
    silentError: true,
  })
}
export function deleteApplication(id: string) {
  return httpClient.delete<MicroApplication>(
    '/applications/' + encodeURIComponent(id),
    { headers: requestHeaders },
  )
}
export function restoreApplication(id: string) {
  return httpClient.post<MicroApplication>(
    '/applications/' + encodeURIComponent(id) + '/restore',
    {},
    { headers: requestHeaders },
  )
}
export function listApplications(signal?: AbortSignal) {
  return httpClient.get<MicroApplication[]>('/applications', { signal })
}
export function getApplication(id: string, signal?: AbortSignal) {
  return httpClient.get<ApplicationDetail>(
    '/applications/' + encodeURIComponent(id),
    { signal, silentError: true },
  )
}
export function createApplication(input: ApplicationInput) {
  return httpClient.post<{
    application: MicroApplication
    task: ApplicationTask
  }>('/applications', input, { headers: requestHeaders })
}
export function updateApplication(id: string, input: ApplicationInput) {
  return httpClient.put<MicroApplication>(
    '/applications/' + encodeURIComponent(id),
    input,
    { headers: requestHeaders },
  )
}
export function startApplicationTask(
  id: string,
  action: ApplicationTask['kind'],
  releaseId?: string,
) {
  return httpClient.post<ApplicationTask>(
    '/applications/' + encodeURIComponent(id) + '/' + action,
    { releaseId },
    { headers: requestHeaders },
  )
}
