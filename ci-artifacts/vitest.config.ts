import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['tests/e2e/**', 'playwright-results/**', '**/node_modules/**'],
    testTimeout: 10000
  }
})
