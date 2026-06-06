import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: null,
      // El manifest de la PWA ya existe como archivo estatico en public/.
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Los exportadores se cargan bajo demanda y pueden superar 1.5 MB.
        // Cachearlos al usarlos evita inflar la primera instalacion del SW.
        globIgnores: [
          'og-image.png',
          'assets/builders-*.js',
          'assets/html2canvas-*.js',
          'assets/index.es-*.js',
          'assets/jspdf*.js',
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    // Politica explicita: navegadores Baseline con soporte completo de PWA,
    // Web Push, CSS moderno y modulos ES.
    target: ['chrome111', 'edge111', 'firefox114', 'safari16.4'],
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-forms',
              test: /node_modules\/(?:react-hook-form|@hookform|zod)/,
            },
            {
              name: 'vendor-react',
              test: /node_modules\/(?:react|react-dom|scheduler|@tanstack)\//,
            },
            { name: 'vendor-radix', test: /node_modules\/@radix-ui\// },
            { name: 'vendor-icons', test: /node_modules\/lucide-react\// },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
