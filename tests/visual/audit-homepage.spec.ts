import { test, expect } from '@playwright/test';

test('audit homepage - full check', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/');
  await page.waitForTimeout(3000);
  
  // 1. 截图 Hero 区域
  await page.screenshot({ path: '/tmp/audit-01-hero.png' });
  
  // 2. 滚动到实验区域并截图
  await page.evaluate(() => {
    document.getElementById('experiments')?.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-02-experiments.png' });
  
  // 3. 点击"全部"筛选
  const allBtn = await page.locator('button:has-text("全部")');
  await allBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-03-filter-all.png' });
  
  // 4. 点击"方法"筛选
  const methodBtn = await page.locator('button:has-text("方法")');
  await methodBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-04-filter-method.png' });
  
  // 5. 点击"力学"筛选
  const mechanicsBtn = await page.locator('button:has-text("力学")');
  await mechanicsBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-05-filter-mechanics.png' });
  
  // 6. 获取页面文本内容检查
  const pageText = await page.locator('body').innerText();
  
  // 审计报告
  const report = {
    hasVtIntegral: pageText.includes('微元法演示'),
    hasOldTitle: pageText.includes('v-t图像'),
    totalScenes: (pageText.match(/0\d/g) || []).length,
    methodCategoryScenes: pageText.includes('方法') && pageText.includes('微元法演示')
  };
  
  console.log('\n=== 审计报告 ===');
  console.log('包含"微元法演示":', report.hasVtIntegral);
  console.log('包含旧标题"v-t图像":', report.hasOldTitle);
  console.log('检查通过:', report.hasVtIntegral && !report.hasOldTitle);
  
  // 截图 vt-integral 卡片细节
  const vtCard = await page.locator('text=微元法演示').first();
  if (await vtCard.isVisible().catch(() => false)) {
    await vtCard.screenshot({ path: '/tmp/audit-06-vt-card.png' });
  }
});
