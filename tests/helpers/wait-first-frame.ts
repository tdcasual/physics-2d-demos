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
      (c) => {
        if (
          c.closest('.mobile-tab-panel') &&
          !c.closest('.mobile-tab-panel')?.classList.contains('active')
        ) {
          return false;
        }
        const style = window.getComputedStyle(c);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
        let parent = c.parentElement;
        while (parent) {
          const parentStyle = window.getComputedStyle(parent);
          if (parentStyle.display === 'none') return false;
          parent = parent.parentElement;
        }
        return true;
      }
    );
    if (canvases.length === 0) return false;
    return canvases.every((c) => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && c.width > 0 && c.height > 0;
    });
  });
  await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
  // 150ms 在 Linux 容器里不够：全场景 ~2% 像素差（layout/读数尚未稳住）。
  // 800ms 仍远低于旧的固定 2000ms。
  await page.waitForTimeout(opts?.remainderMs ?? 800);
}
