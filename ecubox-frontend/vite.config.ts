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
    // Sin `codeSplitting.groups` manual: el agrupamiento por regex forzaba a React
    // a duplicarse (una copia en vendor-react y otra arrastrada por react-hook-form
    // en vendor-forms). Dos instancias de React rompen el estado interno de
    // `lazy`/`Suspense`, lo que hacia que algunos imports diferidos resolvieran a
    // `undefined` (p. ej. "can't access property GuiasMasterPage of undefined").
    // El split automatico de rolldown mantiene una unica instancia de React y
    // evita ciclos de inicializacion entre chunks.
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
