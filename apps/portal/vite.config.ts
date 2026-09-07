import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
const controlTarget =
  process.env.OCEAN_CONTROL_TARGET || 'http://127.0.0.1:5180'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': controlTarget, '/apps': controlTarget },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': controlTarget, '/apps': controlTarget },
  },
})
