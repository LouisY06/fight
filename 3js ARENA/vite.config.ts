import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  plugins: [
    react(),
    electron([
      {
        // Main process entry (game)
        entry: 'electron/main.ts',
      },
      {
        // Preload script (shared by both game and map generator)
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
      },
    ]),
    renderer(),
  ],
  // Multi-page app: game + map generator
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        'map-generator': 'map-generator.html',
      },
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  // Ensure Rapier WASM is handled correctly
  optimizeDeps: {
    exclude: ['@react-three/rapier'],
  },
});
