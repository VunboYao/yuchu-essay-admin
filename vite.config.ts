import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { qiankun } from '@qiankunjs/bundler-plugin/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5174,
    // Fast Refresh 会往 index.html 注入 $RefreshSig$；qiankun 3 ESM 沙箱认错生命周期
    hmr: false,
    strictPort: true,
    proxy: {
      '/admin/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [react(), qiankun()],
})
