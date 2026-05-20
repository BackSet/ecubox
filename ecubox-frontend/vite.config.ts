import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('@tanstack')) return 'vendor-react';
          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('html-to-image') ||
            id.includes('exceljs')
          ) {
            return 'vendor-export';
          }
          if (id.includes('@radix-ui') || id.includes('lucide-react')) return 'vendor-ui';
          return 'vendor';
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
