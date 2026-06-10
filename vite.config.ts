import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      selfDestroying: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'gol_sound.mp3'],
      manifest: {
        name: 'ProdeAR',
        short_name: 'ProdeAR',
        description: 'Web App de Pronósticos Deportivos con Identidad Argentina',
        theme_color: '#0a0f1a',
        background_color: '#0a0f1a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'logo-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
  },
})
