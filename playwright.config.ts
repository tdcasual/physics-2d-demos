import { defineConfig } from '@playwright/test';
import { sharedConfig } from './tests/playwright.shared';

const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  ...sharedConfig,
  testDir: './tests/visual',
  // 基线按平台分目录文件：*-darwin.png 由 Mac 生成维护，*-linux.png 由
  // CI（或等价的 ubuntu 容器，见 ci.yml 的 workflow_dispatch）生成维护。
  // 像素级截图对比无法跨平台复现（CJK 字体光栅化不同），不要试图合并。
  snapshotPathTemplate:
    '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
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
