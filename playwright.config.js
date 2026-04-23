// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright config for Rogue Films v2.
 *
 * Tests run against the Webflow staging URL by default. Override via env:
 *   BASE_URL=https://staging.example/.../ npm test
 *
 * Default points at the Webflow.io subdomain (reads from `WF_SHORT_NAME` if set).
 */

const DEFAULT_SHORT_NAME = 'roguefilms-staging';
const SHORT_NAME = process.env.WF_SHORT_NAME || DEFAULT_SHORT_NAME;
const BASE_URL = process.env.BASE_URL || `https://${SHORT_NAME}.webflow.io`;

module.exports = defineConfig({
  testDir: './code/tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14 Pro'] },
    },
  ],
});
