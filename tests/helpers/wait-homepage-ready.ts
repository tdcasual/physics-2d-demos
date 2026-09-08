import type { Page } from '@playwright/test';

/** Homepage has no `.layout-master`; do not reuse waitForFirstFrame. */
export async function waitForHomepageReady(page: Page): Promise<void> {
  await page.waitForSelector('.site-header, .hero-title', { timeout: 10_000 });
  await page.waitForSelector('.hero-title .line-1', { timeout: 10_000 });
}
