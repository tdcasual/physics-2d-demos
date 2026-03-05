import { expect, test } from '@playwright/test';

const cases = [
  { path: '/src/pages/projectile.html', title: '抛体运动' },
  { path: '/src/pages/chase-meet.html', title: '追及相遇' },
  { path: '/src/pages/field-lines.html', title: '电场线演化' },
  { path: '/src/pages/electrification.html', title: '静电起电演示' },
  { path: '/src/pages/emf-analogy.html', title: '电路水流类比' },
  { path: '/src/pages/vt-integral.html?renderer=experimental', title: '微元法演示' }
] as const;

test('all scene headings use concise naming and remove （2D） suffix', async ({ page }) => {
  for (const item of cases) {
    await page.goto(item.path);
    const heading = page.locator('.teaching-title');
    await expect(heading, item.path).toHaveText(item.title);
    await expect(heading, item.path).not.toContainText('（2D）');
  }
});
