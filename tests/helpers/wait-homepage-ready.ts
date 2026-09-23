import type { Page } from '@playwright/test';

/** Homepage has no `.layout-master`; do not reuse waitForFirstFrame. */
export async function waitForHomepageReady(page: Page): Promise<void> {
  await page.waitForSelector('.site-header', { timeout: 10_000 });
  await page.waitForSelector('.directory-tools', { timeout: 10_000 });
  await page.waitForSelector('.experiment-card', { timeout: 10_000 });
}
