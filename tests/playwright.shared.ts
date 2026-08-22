/**
 * Playwright 共享配置
 *
 * Playwright visual/e2e 配置的共享基础配置，
 * 避免 baseURL、webServer、locale 等重复定义。
 */

const previewCommand = 'pnpm preview --host 127.0.0.1 --port 5177';
const webServerCommand =
  process.env.PLAYWRIGHT_SKIP_BUILD === '1'
    ? previewCommand
    : `pnpm build && ${previewCommand}`;

export const sharedConfig = {
  retries: process.env.CI ? 2 : 0,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: 'http://127.0.0.1:5177',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    actionTimeout: 5_000,
    navigationTimeout: 15_000
  },
  webServer: {
    command: webServerCommand,
    url: 'http://127.0.0.1:5177',
    reuseExistingServer: true,
    timeout: 120_000
  }
};
