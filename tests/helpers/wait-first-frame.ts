import type { Page } from '@playwright/test';

/**
 * Wait until a scene page has marked its first adapter render and visible
 * canvases have non-zero CSS + device pixels. Skip canvases inside inactive
 * mobile tab panels (display:none → 0 size is by design).
 */
export async function waitForFirstFrame(
  page: Page,
  opts?: { remainderMs?: number }
): Promise<void> {
  await page.waitForSelector('.layout-master[data-first-frame="ready"]', {
    timeout: 10_000
  });
  await page.waitForFunction(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')).filter(
      (c) =>
        !c.closest('.mobile-tab-panel') ||
        c.closest('.mobile-tab-panel')?.classList.contains('active')
    );
    if (canvases.length === 0) return false;
    return canvases.every((c) => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && c.width > 0 && c.height > 0;
    });
  });
  await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
  await page.waitForTimeout(opts?.remainderMs ?? 150);
}
