import { test, expect } from '@playwright/test';

const scenes = [
  { id: 'projectile', name: '抛体运动' },
  { id: 'spring-oscillator', name: '弹簧振子' },
  { id: 'chase-meet', name: '追及相遇' },
  { id: 'field-lines', name: '电场线' },
  { id: 'electrification', name: '静电起电' },
  { id: 'vt-integral', name: '微元法' },
  { id: 'emf-analogy', name: '电路类比' },
];

for (const scene of scenes) {
  test(`${scene.name} V2 layout`, async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`http://localhost:5177/src/pages/${scene.id}.html`);
    await page.waitForTimeout(2500);
    
    await page.screenshot({ 
      path: `/tmp/v2-${scene.id}.png`,
      fullPage: false
    });
    
    // 验证基本结构
    const leftPanel = await page.locator('.teaching-left-panel');
    const rightPanel = await page.locator('.teaching-right-panel');
    await expect(leftPanel).toBeVisible();
    await expect(rightPanel).toBeVisible();
    
    console.log(`✅ ${scene.name} OK`);
  });
}
