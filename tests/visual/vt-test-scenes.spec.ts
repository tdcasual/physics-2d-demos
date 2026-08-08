import { test } from '@playwright/test';

test('vt-integral test all scenes', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });

  // 访问页面
  await page.goto('http://localhost:5177/src/pages/vt-integral.html');
  await page.waitForTimeout(1500);

  // 截图 scene1 (默认)
  await page.screenshot({ path: '/tmp/vt-scene1.png' });

  // 点击场景二按钮
  await page.getByRole('button', { name: '化曲为直' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/vt-scene2.png' });

  // 点击场景三按钮
  await page.click('text=圆面积');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/vt-scene3.png' });

  // 当前微元法场景契约包含 v-t面积、曲线逼近、圆面积三个子场景。
});
