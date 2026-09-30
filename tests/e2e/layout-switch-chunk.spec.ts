import { expect, test } from '@playwright/test';
import { scenePage } from '../visual/scene-pages';
import { waitForFirstFrame } from '../helpers/wait-first-frame';

test('layout-switch-runtime chunk is absent until an explicit layout switch', async ({
  page
}) => {
  const urls: string[] = [];
  page.on('request', (req) => {
    urls.push(req.url());
  });

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(scenePage('projectile'), { waitUntil: 'domcontentloaded' });
  await waitForFirstFrame(page);

  const chunkUrl = (url: string) => url.includes('layout-switch-runtime');
  expect(urls.filter(chunkUrl), 'chunk requested before first render').toEqual(
    []
  );

  await expect(page.locator('.layout-switch-btn')).toBeVisible();
  await page.locator('.layout-switch-btn').click();
  await expect.poll(() => urls.some(chunkUrl), { timeout: 15_000 }).toBe(true);
  await expect(page.locator('#app')).not.toHaveAttribute(
    'data-layout-id',
    'split-right'
  );
});
