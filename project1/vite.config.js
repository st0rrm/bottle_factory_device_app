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
      // COOP/COEP 헤더 활성화 (Picovoice SharedArrayBuffer + iframe 임베딩 지원)
      // bottleclub-tree도 COOP 헤더를 설정해야 iframe 로드 가능
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
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
