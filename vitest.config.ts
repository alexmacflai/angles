import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environmentMatchGlobs: [
      ['tests/app/**', 'jsdom'],
      ['tests/unit/**', 'node'],
    ],
    globals: true,
  },
});
