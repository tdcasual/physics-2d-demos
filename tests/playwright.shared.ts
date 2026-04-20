/**
 * Playwright 共享配置
 *
 * 三个 Playwright 配置文件（visual/e2e/parity）的共享基础配置，
 * 避免 baseURL、webServer、locale 等重复定义。
 */

export const sharedConfig = {
  use: {
    baseURL: 'http://127.0.0.1:5177',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai'
  },
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 5177',
    url: 'http://127.0.0.1:5177',
    reuseExistingServer: true,
    timeout: 120_000
  }
};
