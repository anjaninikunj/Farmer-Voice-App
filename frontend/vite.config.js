import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',   // expose to all network interfaces so phone can connect
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // backend dev URL 
        changeOrigin: true,
      },
    },
  },
})
