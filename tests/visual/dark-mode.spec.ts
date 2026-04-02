import { test } from '@playwright/test';

test('弹簧振子暗色模式', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/src/pages/spring-oscillator.html');
  await page.waitForTimeout(2000);
  
  // 点击月夜按钮切换暗色模式
  await page.click('.shell-theme-toggle');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: '/tmp/spring-dark.png' });
});
