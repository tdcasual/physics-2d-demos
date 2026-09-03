import { expect, test } from '@playwright/test';

const PORT = 5177;
const PAGE = `http://127.0.0.1:${PORT}/src/pages/instruments.html`;

test('instrument library loads and can switch to an instrument preview', async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await expect(page.locator('text=仪器组件库').first()).toBeVisible();

  const entryButton = page.getByRole('button', { name: '高精度干涉测微仪' });
  await expect(entryButton).toBeVisible();
  await entryButton.click();

  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return (
      canvas instanceof HTMLCanvasElement &&
      canvas.width > 200 &&
      canvas.height > 120
    );
  });

  const canvasMetrics = await page
    .locator('canvas')
    .first()
    .evaluate((node) => {
      const canvas = node as HTMLCanvasElement;
      const preview = canvas.parentElement;
      return {
        previewHeight: preview?.clientHeight ?? 0,
        previewWidth: preview?.clientWidth ?? 0,
        height: canvas.height,
        width: canvas.width
      };
    });

  expect(canvasMetrics.previewWidth).toBeGreaterThan(200);
  expect(canvasMetrics.previewHeight).toBeGreaterThan(120);
  expect(canvasMetrics.width).toBeGreaterThan(200);
  expect(canvasMetrics.height).toBeGreaterThan(120);
  // 桌面端：tab 条隐藏，参数区与信息区并排可见
  await expect(page.locator('.il-tabs')).toBeHidden();
  await expect(page.locator('.il-params >> text=参数调节')).toBeVisible();
  await expect(page.locator('.il-meta >> text=名称')).toBeVisible();
});

test('instrument library on mobile: horizontal chips, tab panel, responsive canvas', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 侧栏变为横向分类条：窄高、可横向滚动
  const sidebar = page.locator('.il-sidebar');
  await expect(sidebar).toBeVisible();
  const sidebarBox = await sidebar.boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(sidebarBox!.height).toBeLessThan(80);
  expect(sidebarBox!.width).toBe(390);

  // tab 条可见，默认参数页
  const info = page.locator('.il-info');
  await expect(page.locator('.il-tabs')).toBeVisible();
  await expect(page.locator('.il-params')).toBeVisible();

  // 选择仪器后预览随容器尺寸就位（SVG 仪器：svg 以 width/height 100%
  // 填满预览区，其 bounding box 即渲染面尺寸）
  await page.getByRole('button', { name: '游标卡尺使用演示' }).click();
  await page.waitForSelector('.il-preview svg');
  const svgBox = await page.locator('.il-preview svg').boundingBox();
  const previewBox = await page.locator('.il-preview').boundingBox();
  expect(svgBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(Math.abs(svgBox!.width - previewBox!.width)).toBeLessThan(2);
  await expect(page.locator('.il-params')).toBeVisible();
  await expect(page.locator('.il-meta')).toBeHidden();

  // 切换到信息 tab
  await page.getByRole('button', { name: '组件信息' }).click();
  await expect(info).toHaveAttribute('data-tab', 'meta');
  await expect(page.locator('.il-meta')).toBeVisible();
  await expect(page.locator('.il-params')).toBeHidden();

  // 横竖屏切换（容器尺寸变化）→ 渲染面跟随预览区重排
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => {
    const svg = document.querySelector('.il-preview svg');
    const preview = document.querySelector('.il-preview');
    return (
      !!svg &&
      !!preview &&
      Math.abs(svg.getBoundingClientRect().width - preview.clientWidth) < 2 &&
      preview.clientWidth > 500
    );
  });
});
