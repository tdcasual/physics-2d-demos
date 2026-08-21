import { defineConfig } from '@playwright/test';
import { sharedConfig } from './tests/playwright.shared';

const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  ...sharedConfig,
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    ...sharedConfig.use,
    viewport: { width: 1280, height: 720 },
    ...(systemChromium
      ? { launchOptions: { executablePath: systemChromium } }
      : {})
  }
});
