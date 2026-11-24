/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The browser only ever talks to this origin; /api is proxied to the backend,
// so no CORS is needed and the Fake Store API is never called from the client.
const apiTarget = process.env.API_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': apiTarget } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
