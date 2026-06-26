import { defineConfig } from '@playwright/test';
import * as path from 'path';

// Load .env file if present (copy .env.example to .env and adjust values)
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    ignoreHTTPSErrors: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://typo3-content-blocks-gui.ddev.site/typo3/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'login',
      testMatch: 'login.spec.ts',
    },
    {
      name: 'list',
      testMatch: 'list.spec.ts',
      dependencies: ['login'],
    },
    {
      name: 'editor',
      testMatch: 'editor.spec.ts',
      dependencies: ['login'],
    },
    {
      name: 'roundtrip',
      testMatch: 'roundtrip.spec.ts',
      dependencies: ['login'],
    },
  ],
});
