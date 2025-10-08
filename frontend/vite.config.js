import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), sentryVitePlugin({
    org: "daniel-a67",
    project: "frontend"
  })],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'build',
    sourcemap: true
  }
})