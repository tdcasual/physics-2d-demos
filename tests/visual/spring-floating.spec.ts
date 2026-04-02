import { test } from '@playwright/test';

test('spring oscillator floating controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5177/src/pages/spring-oscillator.html');
  await page.waitForTimeout(3000);
  
  // 截图浮动控制区域
  const floatingControls = await page.locator('.floating-controls');
  await floatingControls.screenshot({ path: '/tmp/floating-controls.png' });
  
  // 获取样式
  const styles = await page.evaluate(() => {
    const el = document.querySelector('.floating-controls') as HTMLElement;
    if (!el) return null;
    const computed = getComputedStyle(el);
    return {
      background: computed.background,
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      position: computed.position,
      top: computed.top,
      left: computed.left,
    };
  });
  
  console.log('Floating controls styles:', styles);
});
