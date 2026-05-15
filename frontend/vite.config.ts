import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    hmr: {
      clientPort: 5173,
      overlay: false,
    },
    proxy: {
      '/api': { target: 'http://localhost:8080', cookieDomainRewrite: { '*': '' } },
      '/.well-known': { target: 'http://localhost:8080', cookieDomainRewrite: { '*': '' } },
      '/token': { target: 'http://localhost:8080', cookieDomainRewrite: { '*': '' } },
      '/register': { target: 'http://localhost:8080', cookieDomainRewrite: { '*': '' } },
      '/auth/google': { target: 'http://localhost:8080', cookieDomainRewrite: { '*': '' } },
      '/auth/github': { target: 'http://localhost:8080', cookieDomainRewrite: { '*': '' } },
      '/revoke': { target: 'http://localhost:8080', cookieDomainRewrite: { '*': '' } },
    }
  }
})
