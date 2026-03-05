import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/parity',
  timeout: 60_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5177',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai'
  },
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 5177',
    url: 'http://127.0.0.1:5177',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
