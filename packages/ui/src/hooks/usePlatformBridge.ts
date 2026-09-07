import { useEffect, useState } from 'react'
import { CHANNEL, isBridgeMessage } from '@ocean-cloud/bridge'
import type { MicroApplicationId } from '@ocean-cloud/bridge'
import { getApplicationRuntime } from '../utils/applicationRuntime'
interface PlatformBridgeOptions {
  readonly appId: MicroApplicationId
  readonly portalOrigin: string
}
export function usePlatformBridge({
  appId,
  portalOrigin,
}: PlatformBridgeOptions) {
  const isEmbedded = window.parent !== window
  const [platformName, setPlatformName] = useState('独立运行')
  useEffect(() => {
    if (!isEmbedded) return
    function handleMessage(event: MessageEvent<unknown>) {
      if (
        event.origin === portalOrigin &&
        event.source === window.parent &&
        isBridgeMessage(event.data) &&
        event.data.type === 'context'
      )
        setPlatformName(event.data.platform)
    }
    window.addEventListener('message', handleMessage)
    window.parent.postMessage(
      { channel: CHANNEL, type: 'ready', appId },
      portalOrigin,
    )
    return () => window.removeEventListener('message', handleMessage)
  }, [appId, isEmbedded, portalOrigin])
  function navigateHome() {
    if (isEmbedded)
      window.parent.postMessage(
        { channel: CHANNEL, type: 'navigate', path: '/applications' },
        portalOrigin,
      )
  }
  return {
    isEmbedded,
    platformName,
    portalUrl:
      getApplicationRuntime().portalUrl ||
      new URL('/#/applications', portalOrigin).href,
    navigateHome,
  }
}
