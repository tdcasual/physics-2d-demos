import { expect, test } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

test('all scene headings and document titles use concise naming', async ({
  page
}) => {
  for (const sceneId of sceneIds) {
    await page.goto(scenePage(sceneId));
    const title = await page.title();
    expect(title, sceneId).toBeTruthy();
    expect(title, sceneId).not.toContain('（2D）');
    // 如果页面有 teaching-title 元素，验证其内容
    const heading = page.locator('.teaching-title');
    const count = await heading.count();
    if (count > 0) {
      await expect(heading, sceneId).toHaveText(title);
      await expect(heading, sceneId).not.toContainText('（2D）');
    }
  }
});
