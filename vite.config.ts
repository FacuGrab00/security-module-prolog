import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const prologPort  = env.PROLOG_PORT   || '8080'
  const frontendPort = Number(env.FRONTEND_PORT || '5173')

  return {
    plugins: [vue()],
    server: {
      port: frontendPort,
      proxy: {
        '/api': {
          target: `http://localhost:${prologPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
