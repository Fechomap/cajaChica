import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts', 'dist/', '_legacy/'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      '@adapters': './src/adapters',
      '@application': './src/application',
      '@domain': './src/domain',
      '@infrastructure': './src/infrastructure',
      '@shared': './src/shared',
      '@config': './src/config',
      '@container': './src/container',
    },
  },
});
