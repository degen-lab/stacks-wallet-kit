import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [{ src: 'manifest.json', dest: '.' }],
      }),
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup.html'),
          playground: resolve(__dirname, 'src/playground.html'),
          background: resolve(__dirname, 'src/background.ts'),
          'popup-script': resolve(__dirname, 'src/popup.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Put HTML files in the root, other assets in assets folder
            if (assetInfo.name?.endsWith('.html')) {
              return '[name][extname]'
            }
            return 'assets/[name][extname]'
          },
        },
      },
      assetsInlineLimit: 0,
    },
    base: './',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        buffer: 'buffer',
      },
    },
    define: {
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(
        env.GOOGLE_CLIENT_ID || ''
      ),
      'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(
        env.GOOGLE_CLIENT_SECRET || ''
      ),
      global: 'globalThis',
      'process.env': {},
    },
    publicDir: false,
  }
})
