import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/domain': path.resolve(__dirname, '../appointment-api-service/src/domain'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
})
