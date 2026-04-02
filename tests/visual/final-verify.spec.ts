import { test, expect } from '@playwright/test';

test('final verification with cache bypass', async ({ page }) => {
  // 禁用缓存并刷新
  await page.route('**/*', route => route.continue());
  
  await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // 滚动到实验区域
  await page.evaluate(() => {
    const el = document.getElementById('experiments');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(500);
  
  // 点击"方法"筛选
  await page.click('button:has-text("方法")');
  await page.waitForTimeout(500);
  
  // 验证"微元法演示"卡片可见
  const vtCard = page.locator('.experiment-card:has-text("微元法演示")');
  await expect(vtCard).toBeVisible();
  
  // 截图确认
  await page.screenshot({ path: '/tmp/final-verify.png' });
  
  // 验证没有旧标题
  const oldTitle = page.locator('.experiment-card:has-text("v-t图像")');
  await expect(oldTitle).toHaveCount(0);
  
  console.log('✅ 验证通过：微元法演示已正确显示');
});
