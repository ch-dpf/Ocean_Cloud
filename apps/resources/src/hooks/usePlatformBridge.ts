import { usePlatformBridge as useSharedPlatformBridge } from '@ocean-cloud/ui'
const PORTAL_ORIGIN =
  import.meta.env.VITE_PORTAL_ORIGIN || 'http://localhost:5173'
export function usePlatformBridge() {
  return useSharedPlatformBridge({
    appId: 'resources',
    portalOrigin: PORTAL_ORIGIN,
  })
}
