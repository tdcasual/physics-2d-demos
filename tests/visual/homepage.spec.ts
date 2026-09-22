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

test('experiment cards become visible after jumping to the directory', async ({
  page
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await waitForHomepageReady(page);
  await page.locator('#experiments').waitFor();

  await page.getByRole('link', { name: '浏览全部实验' }).click();

  await expect(page.locator('#experiments .section-header')).toHaveCSS(
    'opacity',
    '1'
  );
  await expect(page.locator('#experiments .experiment-card').first()).toHaveCSS(
    'opacity',
    '1'
  );
});

test('homepage directory supports URL filters and search', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?domain=optics#experiments');
  await waitForHomepageReady(page);

  await expect(
    page.getByRole('button', { name: '光学', pressed: true })
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await expect(page.locator('.directory-status')).toContainText('个实验');

  await page.getByRole('searchbox', { name: '搜索实验' }).fill('折射');
  await expect(page).toHaveURL(/q=%E6%8A%98%E5%B0%84/);
  await expect(page.locator('.directory-status')).toContainText('搜索“折射”');
});

test('mobile navigation controls meet touch target size', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await waitForHomepageReady(page);

  const toggle = page.getByRole('button', { name: '打开导航菜单' });
  const toggleBox = await toggle.boundingBox();
  expect(toggleBox?.width).toBeGreaterThanOrEqual(44);
  expect(toggleBox?.height).toBeGreaterThanOrEqual(44);

  await toggle.click();
  for (const link of await page.locator('.nav.is-open a').all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});
