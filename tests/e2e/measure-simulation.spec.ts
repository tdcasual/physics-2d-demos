import { test, expect } from '@playwright/test';

const LAMBDA_NM = 532;
const D_MM = 0.20;
const L_M = 0.7;
const THEORETICAL_DELTA_X_MM = (LAMBDA_NM * 1e-9 * L_M) / (D_MM * 1e-3) * 1000;

async function collapseReadout(page: import('@playwright/test').Page) {
  const toggle = page.locator('[aria-label="实验状态"] button:has-text("折叠")');
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(200);
  }
}

test('double-slit step 6: theoretical fringe spacing is correct', async ({ page }) => {
  await page.goto('/src/pages/double-slit.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  await page.locator('button:has-text("6. 目镜观察")').click();
  await page.waitForTimeout(1200);
  
  const fringeSpacingLabel = page.locator('.teaching-readout-label:has-text("条纹间距 Δx")').first();
  await expect(fringeSpacingLabel).toBeVisible();
  const fringeSpacingValue = await fringeSpacingLabel.locator('+ strong').textContent();
  expect(fringeSpacingValue).toBe(`${THEORETICAL_DELTA_X_MM.toFixed(3)} mm`);
});

test('double-slit step 6: caliper drag changes reading correctly', async ({ page }) => {
  await page.goto('/src/pages/double-slit.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  await page.locator('button:has-text("6. 目镜观察")').click();
  await page.waitForTimeout(1200);
  
  await collapseReadout(page);
  
  const caliper = page.locator('.microscope-root');
  await expect(caliper).toBeVisible();
  
  const initialReadout = await page.locator('.teaching-readout-label:has-text("游标卡尺读数") + strong').textContent();
  const initialReading = parseFloat(initialReadout?.replace('mm', '').trim() ?? '0');
  
  const slider = caliper.locator('.slider-assembly');
  const sliderBox = await slider.boundingBox();
  expect(sliderBox).not.toBeNull();
  
  await slider.dragTo(slider, {
    sourcePosition: { x: sliderBox!.width / 2, y: sliderBox!.height / 2 },
    targetPosition: { x: sliderBox!.width / 2 + 30, y: sliderBox!.height / 2 }
  });
  await page.waitForTimeout(300);
  
  const newReadout = await page.locator('.teaching-readout-label:has-text("游标卡尺读数") + strong').textContent();
  const newReading = parseFloat(newReadout?.replace('mm', '').trim() ?? '0');
  
  const expectedDeltaMm = (30 / 2 / 96) * 10;
  const actualDeltaMm = newReading - initialReading;
  
  console.log(`Caliper: initial=${initialReading}mm, final=${newReading}mm, expectedDelta=${expectedDeltaMm.toFixed(3)}mm, actualDelta=${actualDeltaMm.toFixed(3)}mm`);
  expect(Math.abs(actualDeltaMm - expectedDeltaMm)).toBeLessThan(expectedDeltaMm * 0.08);
});

test('double-slit step 6: micrometer drag changes reading correctly', async ({ page }) => {
  await page.goto('/src/pages/double-slit.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  await page.locator('button:has-text("6. 目镜观察")').click();
  await page.waitForTimeout(1200);
  
  await collapseReadout(page);
  
  await page.locator('button:has-text("高精度干涉测微仪")').click();
  await page.waitForTimeout(800);
  
  const micrometer = page.locator('.micrometer-root');
  await expect(micrometer).toBeVisible();
  
  const initialReadout = await page.locator('.teaching-readout-label:has-text("螺旋测微仪读数") + strong').textContent();
  const initialReading = parseFloat(initialReadout?.replace('mm', '').trim() ?? '0');
  
  const thimble = micrometer.locator('.thimble-group');
  const thimbleBox = await thimble.boundingBox();
  expect(thimbleBox).not.toBeNull();
  
  await thimble.dragTo(thimble, {
    sourcePosition: { x: thimbleBox!.width / 2, y: thimbleBox!.height / 2 },
    targetPosition: { x: thimbleBox!.width / 2 + 30, y: thimbleBox!.height / 2 }
  });
  await page.waitForTimeout(300);
  
  const newReadout = await page.locator('.teaching-readout-label:has-text("螺旋测微仪读数") + strong').textContent();
  const newReading = parseFloat(newReadout?.replace('mm', '').trim() ?? '0');
  
  const expectedDeltaMm = (30 / 1.8 / 11) * 0.5;
  const actualDeltaMm = newReading - initialReading;
  
  console.log(`Micrometer: initial=${initialReading}mm, final=${newReading}mm, expectedDelta=${expectedDeltaMm.toFixed(3)}mm, actualDelta=${actualDeltaMm.toFixed(3)}mm`);
  expect(Math.abs(actualDeltaMm - expectedDeltaMm)).toBeLessThan(expectedDeltaMm * 0.15);
});

test('double-slit step 6: stripe position changes on drag', async ({ page }) => {
  await page.goto('/src/pages/double-slit.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  await page.locator('button:has-text("6. 目镜观察")').click();
  await page.waitForTimeout(1200);
  
  await collapseReadout(page);
  
  const caliper = page.locator('.microscope-root');
  await expect(caliper).toBeVisible();
  
  const stripeLayer = caliper.locator('.stripe-layer');
  const initialBgPos = await stripeLayer.evaluate((el) => window.getComputedStyle(el).backgroundPositionX);
  console.log('Caliper initial bgPos:', initialBgPos);
  
  const slider = caliper.locator('.slider-assembly');
  const sliderBox = await slider.boundingBox();
  await slider.dragTo(slider, {
    sourcePosition: { x: sliderBox!.width / 2, y: sliderBox!.height / 2 },
    targetPosition: { x: sliderBox!.width / 2 + 30, y: sliderBox!.height / 2 }
  });
  await page.waitForTimeout(300);
  
  const newBgPos = await stripeLayer.evaluate((el) => window.getComputedStyle(el).backgroundPositionX);
  console.log('Caliper final bgPos:', newBgPos);
  expect(initialBgPos).not.toBe(newBgPos);
  
  await page.locator('button:has-text("高精度干涉测微仪")').click();
  await page.waitForTimeout(800);
  
  const micrometer = page.locator('.micrometer-root');
  await expect(micrometer).toBeVisible();
  
  const lensView = micrometer.locator('.lens-view');
  const microInitialBgPos = await lensView.evaluate((el) => window.getComputedStyle(el).backgroundPositionX);
  console.log('Micrometer initial bgPos:', microInitialBgPos);
  
  const thimble = micrometer.locator('.thimble-group');
  const thimbleBox = await thimble.boundingBox();
  await thimble.dragTo(thimble, {
    sourcePosition: { x: thimbleBox!.width / 2, y: thimbleBox!.height / 2 },
    targetPosition: { x: thimbleBox!.width / 2 + 30, y: thimbleBox!.height / 2 }
  });
  await page.waitForTimeout(300);
  
  const microNewBgPos = await lensView.evaluate((el) => window.getComputedStyle(el).backgroundPositionX);
  console.log('Micrometer final bgPos:', microNewBgPos);
  expect(microInitialBgPos).not.toBe(microNewBgPos);
});
