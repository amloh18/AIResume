import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` / `client-only` throw when imported outside the correct
      // React Server Component condition, which Vitest does not provide. Stub
      // them so server modules can be unit-tested in isolation.
      'server-only': path.resolve(__dirname, './vitest.server-only-stub.ts'),
      'client-only': path.resolve(__dirname, './vitest.client-only-stub.ts'),
    },
  },
});
