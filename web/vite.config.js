import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2020',
    // Keep bundle small for eventual Pi Zero serving
    rollupOptions: {
      output: {
        manualChunks: {
          playcanvas: ['playcanvas'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
