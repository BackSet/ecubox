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
          // Un unico grupo `vendor` con TODO el ecosistema de React (react,
          // react-dom, scheduler, router/query, radix, forms, iconos...). Clave:
          // React y todas las librerias que dependen de el deben quedar en EL
          // MISMO chunk. Separarlas en grupos distintos (vendor-react /
          // vendor-forms / vendor-radix) hacia que rolldown duplicara React en
          // cada grupo, y dos instancias de React rompen `lazy`/`Suspense`
          // (imports diferidos resolviendo a `undefined`).
          //
          // El resto de node_modules (jspdf, html2canvas, exceljs, etc., que solo
          // se importan de forma diferida) NO entra aqui: se deja al split
          // automatico para que siga cargandose bajo demanda y no infle el
          // bundle inicial.
          groups: [
            {
              name: 'vendor',
              test: /node_modules\/(?:@?react|react-dom|scheduler|@tanstack|@radix-ui|@floating-ui|react-hook-form|@hookform|zod|lucide-react|sonner|class-variance-authority|clsx|tailwind-merge|aria-hidden|react-remove-scroll|react-style-singleton|get-nonce|use-callback-ref|use-sidecar|tslib)(?:[\\/]|$)/,
            },
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
