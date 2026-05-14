import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': rootDir } },
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['lib/ui/__tests__/**', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.{ts,tsx}'],
      exclude: ['lib/**/__tests__/**', 'lib/**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
