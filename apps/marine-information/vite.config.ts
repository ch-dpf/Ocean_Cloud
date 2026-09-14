import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { BACKEND_ORIGIN } from '../../backend.config.ts'
// 应用在主平台下的访问路径，需与运行配置 basePath 保持一致
const APP_BASE = '/apps/marine-information/'
// 后端地址在根目录 backend.config.ts 声明；请求先到开发服务器，再由这里的代理转发
const apiTarget = process.env.OCEAN_BUSINESS_TARGET || BACKEND_ORIGIN
const proxy = { '/api': { target: apiTarget, changeOrigin: true } }
// 开发期模拟控制服务注入的运行配置节点；生产由控制服务返回入口 HTML 时注入，只用一份
function devRuntimeConfig(): Plugin {
  return {
    name: 'ocean-dev-runtime-config',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(
          '<head>',
          `<head>
    <script type="application/json" id="ocean-application-config">${JSON.stringify({ basePath: APP_BASE, portalUrl: '/#/applications', name: '海洋信息' })}</script>`,
        ),
    },
  }
}
export default defineConfig(({ command }) => ({
  plugins: [react(), devRuntimeConfig()],
  // 开发期挂在主平台的同源路径下，与主平台共享 sessionStorage 中的登录态；构建保持相对路径
  base: command === 'serve' ? APP_BASE : './',
  server: { port: 5176, strictPort: true, host: '0.0.0.0', proxy },
  preview: { port: 5176, strictPort: true, proxy },
}))
