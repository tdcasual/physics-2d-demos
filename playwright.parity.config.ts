import { defineConfig } from '@playwright/test';
import { sharedConfig } from './tests/playwright.shared';

export default defineConfig({
  ...sharedConfig,
  testDir: './tests/parity',
  timeout: 60_000,
  fullyParallel: false,
  use: {
    ...sharedConfig.use,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  }
});
