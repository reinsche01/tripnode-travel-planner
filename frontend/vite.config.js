import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy PDF/canvas libs into their own chunk (lazy-loaded)
          'pdf-libs': ['jspdf', 'html2canvas'],
          // Split React + Router core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split DnD toolkit
          'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // Split state management + http
          'state-vendor': ['zustand', 'axios'],
        },
      },
    },
  },
});
