import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',  // Vercel 배포용
  optimizeDeps: {
    exclude: ['@picovoice/porcupine-web', '@picovoice/web-voice-processor']
  },
  server: {
    headers: {
      // COOP/COEP 헤더는 Picovoice SharedArrayBuffer를 위해 필요하지만
      // iframe 임베딩을 차단하므로 주석 처리
      // 'Cross-Origin-Embedder-Policy': 'require-corp',
      // 'Cross-Origin-Opener-Policy': 'same-origin'
    },
    proxy: {
      '/api': {
        target: 'https://returnmecup-api-dev.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})
