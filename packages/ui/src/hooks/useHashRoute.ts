import { useSyncExternalStore } from 'react'
function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}
function getPathname() {
  if (!['/', '/index.html'].includes(window.location.pathname))
    return window.location.pathname
  return window.location.hash.slice(1) || '/'
}
export function useHashRoute() {
  return useSyncExternalStore(subscribe, getPathname, () => '/')
}
