// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Allow connections from outside
    open: true, // Auto-open browser
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // Handle Ammo.js as a dependency
  optimizeDeps: {
    include: ['three', 'ammo.js', 'gsap'],
  },
});