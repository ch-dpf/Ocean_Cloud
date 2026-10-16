import { useSyncExternalStore } from 'react'
import { getApplicationRuntime } from '../utils/applicationRuntime'
function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}
function getPathname() {
  const { basePath } = getApplicationRuntime()
  if (![basePath, basePath + 'index.html'].includes(window.location.pathname))
    return window.location.pathname
  const raw = window.location.hash.slice(1) || '/'
  // hash 可能带查询串（如 /login?reason=session-expired）：路由只按路径精确匹配，
  // 因此剥掉查询串，调用方要读参数时自行看 window.location.hash
  const queryIndex = raw.indexOf('?')
  return queryIndex < 0 ? raw : raw.slice(0, queryIndex)
}
export function useHashRoute() {
  return useSyncExternalStore(subscribe, getPathname, () => '/')
}
