import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: [
      'packages/*/test/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
      'apps/*/test/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
    ],
    exclude: ['node_modules', 'dist', '**/fixtures/**', '**/*.fixture.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.test.ts',
        'packages/*/src/**/*.fixture.ts',
        'packages/*/src/**/types.ts',
        'packages/*/src/**/index.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
