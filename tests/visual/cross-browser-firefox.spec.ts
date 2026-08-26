import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

test.use({ browserName: 'firefox', launchOptions: {} });

const PORT = 5177;

for (const scene of sceneIds) {
  test(`firefox loads ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

    await page.goto(`http://127.0.0.1:${PORT}${scenePage(scene)}`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);

    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}

/** Sample a coarse pixel signature of the first on-screen canvas. */
function canvasSignature(): string | null {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  const c = canvas as HTMLCanvasElement;
  const ctx = c.getContext('2d');
  if (!ctx || c.width === 0 || c.height === 0) return null;
  try {
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let hash = 0;
    for (let i = 0; i < data.length; i += 64) {
      hash = (hash * 31 + data[i] + data[i + 1] + data[i + 2]) >>> 0;
    }
    return `${c.width}x${c.height}:${hash}`;
  } catch {
    return null;
  }
}

test('firefox field-lines slider repaints canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  // field-lines 的「电场线密度」滑块在 onChange 中立即 setDensity + render，
  // 暂停状态下也会重绘 canvas（projectile 等场景暂停时改参数不重绘，不适合本断言）
  await page.goto(`http://127.0.0.1:${PORT}${scenePage('field-lines')}`, {
    waitUntil: 'domcontentloaded'
  });
  // 等待 canvas 渲染出内容（像素轮询，同 layout-interactions 的写法）
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    const c = canvas as HTMLCanvasElement;
    const ctx = c.getContext('2d');
    if (!ctx || c.width === 0 || c.height === 0) return false;
    try {
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < data.length; i += 16) {
        if (
          data[i] < 250 ||
          data[i + 1] < 250 ||
          data[i + 2] < 250 ||
          data[i + 3] < 255
        ) {
          return true;
        }
      }
    } catch {
      /* ignore */
    }
    return false;
  });

  // 「线密度」section 默认折叠，先展开（折叠开关只响应卡片 toggle 按钮）
  const densityCard = page.locator('[data-control-section="线密度"]');
  await densityCard.getByRole('button', { name: '展开' }).click();

  const slider = page.getByRole('slider', { name: '电场线密度' });
  await expect(slider).toBeVisible();

  const before = await page.evaluate(canvasSignature);
  expect(before).not.toBeNull();

  // 把一个滑块推到量程内距当前值 30% 的新值（与 generic-controls 同策略）
  await slider.evaluate((el: HTMLInputElement) => {
    const min = Number(el.min);
    const max = Number(el.max);
    const value = Number(el.value);
    const next =
      value < (min + max) / 2
        ? Math.min(max, value + (max - min) * 0.3)
        : Math.max(min, value - (max - min) * 0.3);
    el.value = String(next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // 断言 canvas 像素发生变化
  await page.waitForFunction(
    (previous) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const c = canvas as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx || c.width === 0 || c.height === 0) return false;
      try {
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let hash = 0;
        for (let i = 0; i < data.length; i += 64) {
          hash = (hash * 31 + data[i] + data[i + 1] + data[i + 2]) >>> 0;
        }
        return `${c.width}x${c.height}:${hash}` !== previous;
      } catch {
        return false;
      }
    },
    before,
    { timeout: 5000 }
  );
});
