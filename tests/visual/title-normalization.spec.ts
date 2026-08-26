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
    // 分隔符统一为「标题 - 物理演示」（半角连字符；禁止全角破折号或无后缀）。
    // 例外页（不参与本遍历）：index.html 首页品牌标题、index-layout-test.html 测试页。
    expect(title, sceneId).toMatch(/^.+ - 物理演示$/);
    // 如果页面有 teaching-title 元素，验证其内容
    const heading = page.locator('.teaching-title');
    const count = await heading.count();
    if (count > 0) {
      await expect(heading, sceneId).toHaveText(title);
      await expect(heading, sceneId).not.toContainText('（2D）');
    }
  }
});
