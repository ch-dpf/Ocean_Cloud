import { useEffect, useState } from 'react'
import { CHANNEL, isBridgeMessage } from '@ocean-cloud/bridge'
const PORTAL_ORIGIN =
  import.meta.env.VITE_PORTAL_ORIGIN || 'http://localhost:5173'
export function usePlatformBridge() {
  const isEmbedded = window.parent !== window
  const [platformName, setPlatformName] = useState('独立运行')
  useEffect(() => {
    if (!isEmbedded) return
    function handleMessage(event: MessageEvent<unknown>) {
      if (
        event.origin === PORTAL_ORIGIN &&
        event.source === window.parent &&
        isBridgeMessage(event.data) &&
        event.data.type === 'context'
      )
        setPlatformName(event.data.platform)
    }
    window.addEventListener('message', handleMessage)
    window.parent.postMessage(
      { channel: CHANNEL, type: 'ready', appId: 'resources' },
      PORTAL_ORIGIN,
    )
    return () => window.removeEventListener('message', handleMessage)
  }, [isEmbedded])
  function navigateHome() {
    if (isEmbedded)
      window.parent.postMessage(
        { channel: CHANNEL, type: 'navigate', path: '/' },
        PORTAL_ORIGIN,
      )
  }
  return { isEmbedded, platformName, navigateHome }
}
