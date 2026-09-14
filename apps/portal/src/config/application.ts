// 系统指标 WebSocket：使用同源相对地址，由开发代理或部署网关转发到后端
export const SYSTEM_METRICS_WS_URL =
  import.meta.env.VITE_SYSTEM_METRICS_WS_URL || '/ws/system-metrics'
