import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // CSP eval 경고 방지를 위한 설정
  build: {
    sourcemap: false, // 프로덕션에서 source map 비활성화
  },
  esbuild: {
    // eval 대신 다른 방식 사용
    supported: {
      'dynamic-import': true,
    },
  },
})
