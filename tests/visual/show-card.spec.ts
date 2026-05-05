import { test, expect } from '@playwright/test';

test('show vt-integral card clearly', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/');
  await page.waitForLoadState('domcontentloaded');

  // 找到实验区域
  const experimentsSection = await page.locator('#experiments');
  await expect(experimentsSection).toBeVisible();

  // 滚动到实验区域并额外向下滚动一点显示卡片
  await experimentsSection.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    window.scrollTo(0, rect.top + window.scrollY - 100);
  });
  await page.waitForTimeout(500);

  // 点击"方法"筛选
  await page.click('button:has-text("方法")');
  await page.waitForTimeout(500);

  // 截图 - 应该能看到微元法卡片
  await page.screenshot({ path: '/tmp/show-card.png' });

  // 验证卡片可见
  const card = page
    .locator('.experiment-card')
    .filter({ hasText: '微元法' });
  await expect(card).toBeVisible();

  // 获取卡片文字内容
  const cardText = await card.innerText();
  console.log('卡片内容:', cardText);
});
