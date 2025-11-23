import { defineConfig } from 'vite';

// Vite config for a simple Phaser + TypeScript browser game.
// Render.com static hosting:
// - Build command: npm run build
// - Publish directory: dist
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
