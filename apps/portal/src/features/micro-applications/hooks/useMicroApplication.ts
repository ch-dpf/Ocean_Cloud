import { useEffect, useRef, useState } from 'react'
import { CHANNEL, isBridgeMessage } from '@ocean-cloud/bridge'
import type { MicroApplication } from '../../../types/application'
const LOAD_TIMEOUT_MS = 12_000
export function useMicroApplication(application: MicroApplication) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retryCount, setRetryCount] = useState(0)
  const origin = new URL(application.url).origin
  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setStatus('error'),
      LOAD_TIMEOUT_MS,
    )
    function handleMessage(event: MessageEvent<unknown>) {
      if (
        event.origin !== origin ||
        event.source !== frameRef.current?.contentWindow ||
        !isBridgeMessage(event.data)
      )
        return
      if (event.data.type === 'ready' && event.data.appId === application.id) {
        window.clearTimeout(timeoutId)
        setStatus('ready')
        frameRef.current?.contentWindow?.postMessage(
          {
            channel: CHANNEL,
            type: 'context',
            theme: 'light',
            platform: 'Ocean_Cloud',
          },
          origin,
        )
      }
      if (event.data.type === 'navigate') window.location.hash = event.data.path
    }
    window.addEventListener('message', handleMessage)
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('message', handleMessage)
    }
  }, [application.id, origin, retryCount])
  function retry() {
    setStatus('loading')
    setRetryCount((count) => count + 1)
  }
  return { frameRef, status, retryCount, retry }
}
