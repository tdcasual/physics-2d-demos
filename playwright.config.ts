import { defineConfig } from '@playwright/test';
import { sharedConfig } from './tests/playwright.shared';

const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
// 像素基线跨容器代际稳定性：LCD 子像素 AA / 字体亚像素定位随 freetype/fontconfig
// 版本漂移（表现为顶栏与文本的 ~1-2k px 系统性 diff）。固定为灰度 AA + 整数
// 字形定位后，AA 与渲染栈版本解耦。仅在容器 SoT 环境开启（visual-linux-container.sh）。
const stableAaArgs =
  process.env.VISUAL_STABLE_AA === '1'
    ? ['--disable-lcd-text', '--disable-font-subpixel-positioning']
    : [];

export default defineConfig({
  ...sharedConfig,
  testDir: './tests/visual',
  // 基线按平台分目录文件：*-darwin.png 由 Mac 生成维护，*-linux.png 由
  // CI（或等价的 ubuntu 容器，见 ci.yml 的 workflow_dispatch）生成维护。
  // 像素级截图对比无法跨平台复现（CJK 字体光栅化不同），不要试图合并。
  snapshotPathTemplate:
    '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
  timeout: 60_000,
  fullyParallel: false,
  use: {
    ...sharedConfig.use,
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      ...(systemChromium ? { executablePath: systemChromium } : {}),
      ...(stableAaArgs.length ? { args: stableAaArgs } : {})
    }
  }
});
