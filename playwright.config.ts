import { defineConfig } from '@playwright/test';
import { sharedConfig } from './tests/playwright.shared';

export default defineConfig({
  ...sharedConfig,
  testDir: './tests/visual',
  // Keep one reviewed baseline name across development and CI hosts.
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    ...sharedConfig.use,
    viewport: { width: 1280, height: 720 }
  }
});
