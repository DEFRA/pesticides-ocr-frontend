import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: 'threads',
    poolOptions: {
      threads: {
        // Limit concurrency to avoid CPU/disk contention (slower on
        // OneDrive-synced folders) causing server-boot tests to time out.
        maxThreads: 4,
        minThreads: 1
      }
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        ...configDefaults.exclude,
        '.public',
        'coverage',
        'postcss.config.js',
        'stylelint.config.js',
        'vitest.config.js',
        '.sonarlint',
        'babel.config.cjs',
        '*.fixtures.js',
      ]
    }
  }
})
