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
  return window.location.hash.slice(1) || '/'
}
export function useHashRoute() {
  return useSyncExternalStore(subscribe, getPathname, () => '/')
}
