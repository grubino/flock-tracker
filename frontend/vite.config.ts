import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../backend/static'),
    emptyOutDir: true,
  },
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../backend/certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../backend/certs/cert.pem')),
    },
    proxy: {
      '/api': {
        target: 'https://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
