/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/test/**',
        'src/webview/**',
        'dist/**',
        'node_modules/**',
      ],
    },
  },
});
