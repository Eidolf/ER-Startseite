import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['logo.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
            manifest: false, // We serve this dynamically from backend
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        host: true,
        port: 13001,
        proxy: {
            '/api': {
                target: 'http://localhost:13000',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:13000',
                changeOrigin: true,
            },
            '/manifest.webmanifest': {
                target: 'http://localhost:13000',
                changeOrigin: true,
            }
        }
    }
})
