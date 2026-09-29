import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { BACKEND_ORIGIN } from '../../backend.config.ts'
// 后端地址在根目录 backend.config.ts 声明；需要临时改地址时用各自的环境变量覆盖
const controlTarget = process.env.OCEAN_CONTROL_TARGET || BACKEND_ORIGIN
// 业务后端：地理信息等子应用的业务接口经主平台同源地址转发
const businessTarget = process.env.OCEAN_BUSINESS_TARGET || BACKEND_ORIGIN
// 开发期直连子应用开发服务器，使子应用与主平台同源并共享登录态
const gisDevServer = process.env.OCEAN_GIS_TARGET || 'http://127.0.0.1:5175'
const marineDevServer =
  process.env.OCEAN_MARINE_TARGET || 'http://127.0.0.1:5176'
// WebSocket（任务进度、系统指标）同样经同源地址转发
const wsTarget = { target: BACKEND_ORIGIN, changeOrigin: true, ws: true }
// 鉴权接口需要 X-Forwarded-* 头（后端据此取真实客户端 IP，如登录日志的 lastLoginIp）：
// 代理开启 xfwd 补上，字符串简写带不了选项所以要写成对象

// 更具体的业务前缀必须放在通用 /api、/apps 规则之前
const previewProxy = {
  '/api/gis': businessTarget,
  '/api/auth': {
    target: controlTarget,
    xfwd: true
  },
  '/api': controlTarget,
  '/apps': controlTarget,
}
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api/gis': businessTarget,
      // 必须排在下面的 '/api' 之前，否则会被通用规则先匹配走
      '/api/auth': {
        target: controlTarget,
        xfwd: true
      },
      '/apps/geographic-information': {
        target: gisDevServer,
        changeOrigin: true,
        ws: true,
      },
      '/apps/marine-information': {
        target: marineDevServer,
        changeOrigin: true,
        ws: true,
      },
      '/ws': wsTarget,
      '/api': controlTarget,
      '/apps': controlTarget,
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: { ...previewProxy, '/ws': wsTarget },
  },
})
