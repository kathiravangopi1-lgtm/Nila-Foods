import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { loadEnv } from 'vite'

const srcDirectory = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:5000'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': backendUrl,
        '/uploads': backendUrl,
      },
    },
    resolve: {
      alias: {
        '@': srcDirectory,
      },
    },
  }
})
