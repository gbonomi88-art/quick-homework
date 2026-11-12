/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'generateSW',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'], navigateFallback: 'index.html' },
      manifest: {
        name: 'Quick Homework',
        short_name: 'Quick HW',
        description: 'Hausaufgaben machen, abgeben – und dann gibt es eine Belohnung.',
        lang: 'de-CH',
        display: 'standalone',
        start_url: './',
        scope: './',
        orientation: 'any',
        theme_color: '#4A2424',
        background_color: '#4A2424',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
