import { test, expect } from '@playwright/test';

test('vt-integral test all scenes', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });

  // 访问页面
  await page.goto('http://localhost:5177/src/pages/vt-integral.html');
  await page.waitForTimeout(1500);

  // scene-selector 渲染为 role="radio" 的按钮组
  await expect(page.getByRole('radio')).toHaveCount(3);

  // 截图 scene1 (默认)
  await page.screenshot({ path: '/tmp/vt-scene1.png' });

  // 点击场景二按钮
  await page.getByRole('radio', { name: '化曲为直' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/vt-scene2.png' });

  // 点击场景三按钮
  await page.getByRole('radio', { name: '割圆术' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/vt-scene3.png' });

  // 当前微元法场景契约包含 v-t面积、化曲为直、割圆术三个子场景。
});
