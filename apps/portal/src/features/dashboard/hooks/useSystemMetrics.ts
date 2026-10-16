import { useEffect, useRef, useState } from 'react'
import { SYSTEM_METRICS_WS_URL } from '../../../config/application'

export type SystemMetricsStatus = 'connecting' | 'open' | 'error' | 'closed'

/** 系统实时指标，字段与单位以后端 /ws/system-metrics 契约为准 */
export interface SystemMetrics {
  readonly cpuUsage?: number
  readonly gpuUsage?: number
  readonly memoryUsage?: number
  readonly totalMemoryGb?: number
  readonly usedMemoryGb?: number
  readonly freeMemoryGb?: number
  /** 磁盘使用率，后端只推送百分比，没有容量字段 */
  readonly diskUsage?: number
  readonly timestamp?: number
}

/** 后端推送的统一 envelope：{ code, message, data }，指标位于 data 中 */
interface SystemMetricsMessage {
  readonly code?: number
  readonly message?: string
  readonly data?: SystemMetrics | null
}

const RECONNECT_DELAY_MS = 3000

/**
 * 工作台系统指标长连接：连接 /ws/system-metrics，
 * 维护连接状态并缓存最新一条推送，断开后自动重连。
 */
export function useSystemMetrics(): {
  readonly status: SystemMetricsStatus
  readonly metrics: SystemMetrics | null
} {
  const [status, setStatus] = useState<SystemMetricsStatus>('connecting')
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const disposedRef = useRef(false)

  useEffect(() => {
    disposedRef.current = false
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null

    function connect() {
      if (disposedRef.current) return
      setStatus('connecting')
      ws = new WebSocket(SYSTEM_METRICS_WS_URL)

      ws.onopen = () => {
        if (disposedRef.current) return
        setStatus('open')
      }
      ws.onmessage = (event) => {
        if (disposedRef.current) return
        try {
          const payload = JSON.parse(event.data) as SystemMetricsMessage
          if (payload && typeof payload === 'object' && payload.data) {
            setMetrics(payload.data)
          }
        } catch {
          // 忽略非 JSON 消息
        }
      }
      ws.onerror = () => {
        if (disposedRef.current) return
        setStatus('error')
      }
      ws.onclose = () => {
        if (disposedRef.current) return
        setStatus('closed')
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      disposedRef.current = true
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [])

  return { status, metrics }
}
