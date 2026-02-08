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
        // Preload script
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
      },
    ]),
    renderer(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
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
