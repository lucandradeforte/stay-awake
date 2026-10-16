import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 40_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  webServer: {
    command:
      'npm exec --workspace @stay-awake/website -- vite preview --host 127.0.0.1 --port 4173 --strictPort',
    // In this WSL environment, HTTP probes to an unbound port could remain pending.
    // Wait for Vite's readiness line; the website tests verify HTTP and content.
    wait: { stdout: /Local:.*4173/ },
    timeout: 15_000,
  },
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  workers: 1,
});
