import { expect, test } from '@playwright/test';
import { waitForHomepageReady } from '../helpers/wait-homepage-ready';

const PORT = 5177;

test('homepage renders hero, experiments, and theme toggle', async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/`, {
    waitUntil: 'domcontentloaded'
  });
  await waitForHomepageReady(page);

  await expect(page.locator('.hero-title .line-1')).toHaveText('交互式');
  await expect(page.locator('#experiments')).toBeVisible();
  await expect(
    page.getByRole('button', { name: '切换到暗色模式' })
  ).toBeVisible();
  await expect(page.locator('.experiment-card').first()).toBeVisible();

  await page.getByRole('button', { name: '切换到暗色模式' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
