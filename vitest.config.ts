import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure unit tests only — no React Native / DOM here.
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
