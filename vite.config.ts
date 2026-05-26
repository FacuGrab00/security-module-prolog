import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const prologPort = env.PROLOG_PORT || '8080'

  return {
    plugins: [vue()],
    server: {
      proxy: {
        // Redirige /api/* al servidor Prolog — puerto leído desde .env
        '/api': {
          target: `http://localhost:${prologPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
