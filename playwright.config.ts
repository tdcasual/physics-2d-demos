import { defineConfig } from '@playwright/test';
import { sharedConfig } from './tests/playwright.shared';

const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  ...sharedConfig,
  testDir: './tests/visual',
  // Keep one reviewed baseline name across development and CI hosts.
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
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
