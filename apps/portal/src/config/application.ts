// 系统指标 WebSocket：使用同源相对地址，由开发代理或部署网关转发到后端
export const SYSTEM_METRICS_WS_URL =
  import.meta.env.VITE_SYSTEM_METRICS_WS_URL || '/ws/system-metrics'

// 任务进度 WebSocket：与系统指标同样走同源相对地址
export const TASK_WS_URL = import.meta.env.VITE_TASK_WS_URL || '/ws/task'
