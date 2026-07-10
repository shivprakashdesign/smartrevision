import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Bundle .lottie (dotLottie) files as static assets so imports resolve to URLs.
  assetsInclude: ['**/*.lottie'],
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173
  }
})
