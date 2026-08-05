import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Yellow Flag assistant + episodes API (npm run server). Harmless when
      // the server isn't running — the frontend falls back to static data.
      '/api': 'http://localhost:8787',
    },
  },
});
