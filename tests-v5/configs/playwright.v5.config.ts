import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const baseURL = process.env.TEQ_V5_FRONTEND_URL || 'https://local-fe.ferdia.app:8080';

export default defineConfig({
  testDir: '../tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 0,
  workers: 1,
  timeout: parseInt(process.env.TEST_TIMEOUT || '60000'),
  globalSetup: require.resolve('../global-setup'),
  globalTeardown: require.resolve('../../global-teardown'),
  reporter: [
    ['html', { outputFolder: '../../reports/v5/html', open: 'never' }],
    ['json', { outputFile: '../../reports/v5/json/results.json' }],
    ['junit', { outputFile: '../../reports/v5/junit/results.xml' }],
    ['list'],
    ...(process.env.GITHUB_ACTIONS ? [['github'] as const] : []),
    ['../helpers/v5-test-automation-summary-reporter.ts', {
    outputFile: `../../reports/v5/test-automation-summary.html`,
    title: 'Test Automation Report',
  }],
  ],
  use: {
    baseURL,
    trace: process.env.TRACE_ON_FAILURE === 'true' ? 'on-first-retry' : 'off',
    screenshot: process.env.SCREENSHOT_ON_FAILURE === 'true' ? 'only-on-failure' : 'off',
    video: process.env.VIDEO_ON_FAILURE === 'true' ? 'retain-on-failure' : 'off',
    actionTimeout: parseInt(process.env.ACTION_TIMEOUT || '15000'),
    navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '30000'),
    headless: process.env.HEADLESS !== 'false', // Run in headful mode by default for v5 tests
    ignoreHTTPSErrors: true,
    launchOptions: {
      args: ['--start-maximized'],
      // slowMo: 500, // Adds 500ms delay between all Playwright actions
    },
  },
  projects: [
    {
      name: 'v5-chromium',
      use: {
        browserName: 'chromium',
        storageState: path.resolve(__dirname, '../../.auth/v5-user.json'),
        viewport: null,
      },
    },
    // {
    //   name: 'v5-firefox',
    //   use: {
    //     browserName: 'firefox',
    //     storageState: path.resolve(__dirname, '../../.auth/v5-user.json'),
    //   },
    // },
  ],
  outputDir: '../../test-results/v5/',
});
