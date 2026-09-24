/**
 * Generic Dynamic Control Response Tests
 *
 * Strategy: discover controls via DOM, sample each type, verify at least
 * ONE control per category produces a visible scene response.
 * This avoids false failures from decorative buttons or controls whose
 * effect isn't captured by readout/canvas/transport.
 */

import { test, expect, type Page } from '@playwright/test';
import { scenePage } from '../visual/scene-pages';
import { sceneProfiles } from '../helpers/scene-profile';

// ── Constants ───────────────────────────────────────────────────────────

const DESKTOP_VP = { width: 1400, height: 900 } as const;
const MOBILE_VP = { width: 375, height: 812 } as const;

// ── Scene State Capture ─────────────────────────────────────────────────

interface SceneState {
  readout: Record<string, string>;
  transport: { isPlaying: boolean };
  canvasChecksum: number;
  controlSignature: string;
}

async function gotoScene(page: Page, sceneId: string) {
  await page.goto(scenePage(sceneId));
  await page.waitForSelector('.layout-master', {
    state: 'visible',
    timeout: 10000
  });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return canvas !== null && (canvas as HTMLCanvasElement).width > 0;
  });
}

async function getReadoutMap(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const map: Record<string, string> = {};
    document
      .querySelectorAll('.readout-slot .readout-item, .mobile-readout-item')
      .forEach((item) => {
        const label = item.querySelector('.readout-label')?.textContent?.trim();
        const value = item.querySelector('.readout-value')?.textContent?.trim();
        if (label) map[label] = value ?? '';
      });
    return map;
  });
}

async function getTransportState(page: Page): Promise<{ isPlaying: boolean }> {
  return page.evaluate(() => {
    const btn = document.querySelector(
      '.stage-floating-controls button, .mobile-control-btn.play-pause'
    );
    return { isPlaying: btn?.textContent?.includes('⏸') ?? false };
  });
}

async function getCanvasChecksum(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector(
      'canvas.stage-canvas, canvas.mobile-stage-canvas'
    ) as HTMLCanvasElement | null;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    const w = canvas.width,
      h = canvas.height;
    if (w === 0 || h === 0) return 0;
    const cx = Math.floor(w / 2),
      cy = Math.floor(h / 2);
    const size = 20;
    try {
      const data = ctx.getImageData(
        Math.max(0, cx - size),
        Math.max(0, cy - size),
        size * 2,
        size * 2
      ).data;
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return sum;
    } catch {
      return 0;
    }
  });
}

async function captureSceneState(page: Page): Promise<SceneState> {
  const [readout, transport, canvasChecksum, controlSignature] =
    await Promise.all([
      getReadoutMap(page),
      getTransportState(page),
      getCanvasChecksum(page),
      page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '.control-slot button, .mobile-control-slot button, .control-slot input, .mobile-control-slot input, .control-slot select, .mobile-control-slot select'
          )
        )
          .filter((element) => {
            const node = element as HTMLElement;
            return node.offsetParent !== null;
          })
          .map((element) => {
            const node = element as HTMLElement;
            const form = element as HTMLInputElement | HTMLSelectElement;
            return [
              node.getAttribute('aria-checked'),
              node.getAttribute('aria-pressed'),
              node.getAttribute('aria-selected'),
              node.dataset.active,
              node.className,
              'value' in form ? form.value : '',
              'checked' in form ? String(form.checked) : ''
            ].join('|');
          })
          .join('\n')
      )
    ]);
  return { readout, transport, canvasChecksum, controlSignature };
}

function stateChanged(before: SceneState, after: SceneState): boolean {
  if (before.transport.isPlaying !== after.transport.isPlaying) return true;
  if (before.controlSignature !== after.controlSignature) return true;
  const allKeys = new Set([
    ...Object.keys(before.readout),
    ...Object.keys(after.readout)
  ]);
  for (const key of allKeys) {
    if (before.readout[key] !== after.readout[key]) return true;
  }
  if (before.canvasChecksum !== 0 && after.canvasChecksum !== 0) {
    if (Math.abs(before.canvasChecksum - after.canvasChecksum) > 10)
      return true;
  }
  return false;
}

// ── Control Discovery ───────────────────────────────────────────────────

interface DiscoveredSlider {
  nth: number;
  label: string;
  min: number;
  max: number;
  value: number;
  step?: number;
}
interface DiscoveredButton {
  nth: number;
  text: string;
  classification: ButtonType;
}
interface DiscoveredCheckbox {
  nth: number;
  label: string;
  checked: boolean;
}

type ButtonType =
  | 'preset'
  | 'step'
  | 'reset'
  | 'action'
  | 'toggle'
  | 'scene'
  | 'add'
  | 'remove'
  | 'expand'
  | 'transport'
  | 'unknown';

const PRESETS = [
  '地球',
  '月球',
  '火星',
  '强风',
  '单电荷',
  '同种',
  '异种',
  '自定义',
  '摩擦',
  '感应',
  '接触',
  '正弦',
  '抛物线',
  '圆',
  '椭圆',
  'on',
  'off',
  '电路',
  '水路'
];
const STEPS = ['下一步', 'step', '▶▶'];
const RESETS = ['重置', 'reset', '↺'];
const ACTIONS = ['应用', 'apply'];
const ADDS = ['添加', '+', '正电荷', '负电荷'];
const REMOVES = ['移除', '删除', '-'];
const EXPANDS = ['▼', '▶', '展开', '折叠'];
const TRANSPORTS = ['⏸', '▶', '⏵', '暂停', '播放', '单步'];

function classifyButton(text: string): ButtonType {
  const t = text.toLowerCase().trim();
  if (RESETS.some((k) => t.includes(k.toLowerCase()))) return 'reset';
  if (STEPS.some((k) => t.includes(k.toLowerCase()))) return 'step';
  if (ACTIONS.some((k) => t.includes(k.toLowerCase()))) return 'action';
  if (ADDS.some((k) => t.includes(k.toLowerCase()))) return 'add';
  if (REMOVES.some((k) => t.includes(k.toLowerCase()))) return 'remove';
  if (EXPANDS.some((k) => t.includes(k.toLowerCase()))) return 'expand';
  if (TRANSPORTS.some((k) => t.includes(k.toLowerCase()))) return 'transport';
  if (PRESETS.some((k) => t.includes(k.toLowerCase()))) return 'preset';
  return 'unknown';
}

async function discoverControls(page: Page) {
  return page.evaluate(() => {
    const result = {
      sliders: [] as DiscoveredSlider[],
      buttons: [] as DiscoveredButton[],
      checkboxes: [] as DiscoveredCheckbox[]
    };

    document
      .querySelectorAll(
        '.control-slot input[type="range"], .mobile-control-slot input[type="range"]'
      )
      .forEach((el, nth) => {
        const input = el as HTMLInputElement;
        const row = el.closest('div, label');
        const label =
          row?.querySelector('span, label')?.textContent?.trim() ||
          `slider-${nth}`;
        result.sliders.push({
          nth,
          label,
          min: parseFloat(input.min) || 0,
          max: parseFloat(input.max) || 100,
          value: parseFloat(input.value) || 0,
          step: Number.isFinite(parseFloat(input.step))
            ? parseFloat(input.step)
            : 1
        });
      });

    document
      .querySelectorAll('.control-slot button, .mobile-control-slot button')
      .forEach((el, nth) => {
        const text = el.textContent?.trim() || `btn-${nth}`;
        result.buttons.push({
          nth,
          text,
          classification: 'unknown' as ButtonType
        });
      });

    document
      .querySelectorAll(
        '.control-slot input[type="checkbox"], .mobile-control-slot input[type="checkbox"]'
      )
      .forEach((el, nth) => {
        const input = el as HTMLInputElement;
        const row = el.closest('label, div');
        const label = row?.textContent?.trim() || `cb-${nth}`;
        result.checkboxes.push({ nth, label, checked: input.checked });
      });

    return result;
  });
}

async function expandControlCards(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll(
        '.control-slot .collapsed, .mobile-control-slot .collapsed'
      )
      .forEach((card) => {
        // ControlCard toggle is a button inside the header
        const toggle = card.querySelector(':scope > div:first-child button');
        (toggle as HTMLElement)?.click();
      });
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        '.control-slot .collapsed, .mobile-control-slot .collapsed'
      ).length === 0,
    { timeout: 5000 }
  );
}

// ── Per-Category Response Verification ──────────────────────────────────

async function allSlidersRespond(
  page: Page,
  sliders: DiscoveredSlider[],
  area: string
): Promise<{ ok: boolean; detail: string }> {
  if (sliders.length === 0) return { ok: true, detail: 'no sliders' };
  const failures: string[] = [];
  for (const slider of sliders) {
    const locator = page.locator(
      `${area} input[type="range"] >> nth=${slider.nth}`
    );
    if (!(await locator.isVisible().catch(() => false))) continue;

    const before = await captureSceneState(page);
    let testValue =
      slider.value < (slider.min + slider.max) / 2
        ? Math.min(slider.max, slider.value + (slider.max - slider.min) * 0.3)
        : Math.max(slider.min, slider.value - (slider.max - slider.min) * 0.3);
    // Range steps are anchored at min, not at zero.
    const step = slider.step || 1;
    testValue = slider.min + Math.round((testValue - slider.min) / step) * step;
    testValue = Math.max(slider.min, Math.min(slider.max, testValue));
    testValue = Number(testValue.toFixed(12));
    if (testValue === slider.value) {
      testValue =
        slider.value + step <= slider.max
          ? slider.value + step
          : slider.value - step;
    }
    await locator.fill(String(testValue));
    // Some sliders listen to 'change' instead of 'input' — dispatch both
    await locator.evaluate((el: HTMLInputElement) =>
      el.dispatchEvent(new Event('change', { bubbles: true }))
    );

    let after = before;
    const start = Date.now();
    while (Date.now() - start < 3000) {
      after = await captureSceneState(page);
      if (stateChanged(before, after)) break;
      await page.waitForTimeout(50);
    }

    if (stateChanged(before, after)) {
      continue;
    }
    failures.push(
      `"${slider.label}" (${slider.value}→${testValue.toFixed(1)})`
    );
  }
  return failures.length === 0
    ? { ok: true, detail: `all ${sliders.length} sliders responded` }
    : { ok: false, detail: `unresponsive sliders: ${failures.join(', ')}` };
}

async function anyButtonResponds(
  page: Page,
  buttons: DiscoveredButton[],
  area: string
): Promise<{ ok: boolean; detail: string }> {
  const actionable = buttons.filter(
    (b) => !['reset', 'expand', 'transport'].includes(b.classification)
  );
  if (actionable.length === 0)
    return { ok: true, detail: 'no actionable buttons' };

  for (const btn of actionable.slice(0, 4)) {
    const locator = page.locator(`${area} button >> nth=${btn.nth}`);
    if (!(await locator.isVisible().catch(() => false))) continue;

    const before = await captureSceneState(page);
    await locator.click();

    let after = before;
    const start = Date.now();
    const maxWait = btn.classification === 'step' ? 3000 : 2000;
    while (Date.now() - start < maxWait) {
      after = await captureSceneState(page);
      if (stateChanged(before, after)) break;
      await page.waitForTimeout(50);
    }

    if (stateChanged(before, after)) {
      return {
        ok: true,
        detail: `button "${btn.text}" [${btn.classification}] responded`
      };
    }
  }
  return {
    ok: false,
    detail: `tested ${Math.min(actionable.length, 4)} buttons, none responded`
  };
}

async function anyCheckboxResponds(
  page: Page,
  checkboxes: DiscoveredCheckbox[],
  area: string
): Promise<{ ok: boolean; detail: string }> {
  if (checkboxes.length === 0) return { ok: true, detail: 'no checkboxes' };
  for (const cb of checkboxes.slice(0, 2)) {
    const locator = page.locator(
      `${area} input[type="checkbox"] >> nth=${cb.nth}`
    );
    if (!(await locator.isVisible().catch(() => false))) continue;

    const before = await captureSceneState(page);
    const checkedBefore = await locator.isChecked();
    await locator.click();
    const checkedAfter = await locator.isChecked();

    let after = before;
    const start = Date.now();
    while (Date.now() - start < 2000) {
      after = await captureSceneState(page);
      if (stateChanged(before, after)) break;
      await page.waitForTimeout(50);
    }
    const changed = stateChanged(before, after);
    await locator.click(); // restore
    await page.waitForTimeout(200);

    if (changed) {
      return { ok: true, detail: `checkbox "${cb.label}" responded` };
    }
    if (checkedBefore !== checkedAfter) {
      return { ok: true, detail: `checkbox "${cb.label}" toggled` };
    }
  }
  return {
    ok: false,
    detail: `tested ${Math.min(checkboxes.length, 2)} checkboxes, none responded`
  };
}

// ── Desktop Tests ───────────────────────────────────────────────────────

test.describe('Generic Control Response (Desktop)', () => {
  test.use({ viewport: DESKTOP_VP });

  for (const scene of sceneProfiles) {
    const { id: sceneId } = scene;
    test(`${sceneId}: every present control category responds`, async ({
      page
    }) => {
      await gotoScene(page, sceneId);
      await expandControlCards(page);

      const raw = await discoverControls(page);
      const buttons = raw.buttons.map((b) => ({
        ...b,
        classification: classifyButton(b.text)
      }));

      console.log(
        `[${sceneId}] ${raw.sliders.length} sliders, ${buttons.length} buttons, ${raw.checkboxes.length} checkboxes`
      );

      const area = '.control-slot';

      expect(
        raw.sliders.length + buttons.length + raw.checkboxes.length,
        `${sceneId}: control panel must not be empty`
      ).toBeGreaterThan(0);
      const sliderResult = await allSlidersRespond(page, raw.sliders, area);
      console.log(
        `  → sliders: ${sliderResult.ok ? 'PASS' : 'FAIL'} — ${sliderResult.detail}`
      );

      const btnResult = await anyButtonResponds(page, buttons, area);
      console.log(
        `  → buttons: ${btnResult.ok ? 'PASS' : 'FAIL'} — ${btnResult.detail}`
      );

      const cbResult = await anyCheckboxResponds(page, raw.checkboxes, area);
      console.log(
        `  → checkboxes: ${cbResult.ok ? 'PASS' : 'FAIL'} — ${cbResult.detail}`
      );

      const hasSliders = raw.sliders.length > 0;
      const hasButtons =
        buttons.filter(
          (b) => !['reset', 'expand', 'transport'].includes(b.classification)
        ).length > 0;
      const hasCheckboxes = raw.checkboxes.length > 0;

      expect(
        [
          hasSliders && !sliderResult.ok ? sliderResult.detail : null,
          hasButtons && !btnResult.ok ? btnResult.detail : null,
          hasCheckboxes && !cbResult.ok ? cbResult.detail : null
        ].filter(Boolean),
        `${sceneId}: every present control category must expose a response`
      ).toEqual([]);
    });
  }
});

// ── Mobile Tests ────────────────────────────────────────────────────────

test.describe('Generic Control Response (Mobile)', () => {
  test.use({ viewport: MOBILE_VP });

  for (const scene of sceneProfiles) {
    const { id: sceneId } = scene;
    test(`${sceneId}: mobile controls respond`, async ({ page }) => {
      await gotoScene(page, sceneId);
      await expandControlCards(page);

      const raw = await discoverControls(page);
      const buttons = raw.buttons.map((b) => ({
        ...b,
        classification: classifyButton(b.text)
      }));

      console.log(
        `[${sceneId} mobile] ${raw.sliders.length} sliders, ${buttons.length} buttons, ${raw.checkboxes.length} checkboxes`
      );

      // A mobile viewport does not imply MobileStackLayout: scenes may declare
      // another responsive layout (for example ticker-tape's lab-stage).
      const area = '.control-slot';

      expect(
        raw.sliders.length + buttons.length + raw.checkboxes.length,
        `${sceneId} mobile: control panel must not be empty`
      ).toBeGreaterThan(0);
      const sliderResult = await allSlidersRespond(page, raw.sliders, area);
      console.log(
        `  → sliders: ${sliderResult.ok ? 'PASS' : 'FAIL'} — ${sliderResult.detail}`
      );

      const btnResult = await anyButtonResponds(page, buttons, area);
      console.log(
        `  → buttons: ${btnResult.ok ? 'PASS' : 'FAIL'} — ${btnResult.detail}`
      );

      const cbResult = await anyCheckboxResponds(page, raw.checkboxes, area);
      console.log(
        `  → checkboxes: ${cbResult.ok ? 'PASS' : 'FAIL'} — ${cbResult.detail}`
      );

      const hasSliders = raw.sliders.length > 0;
      const hasButtons =
        buttons.filter(
          (b) => !['reset', 'expand', 'transport'].includes(b.classification)
        ).length > 0;
      const hasCheckboxes = raw.checkboxes.length > 0;

      expect(
        [
          hasSliders && !sliderResult.ok ? sliderResult.detail : null,
          hasButtons && !btnResult.ok ? btnResult.detail : null,
          hasCheckboxes && !cbResult.ok ? cbResult.detail : null
        ].filter(Boolean),
        `${sceneId} mobile: every present control category must expose a response`
      ).toEqual([]);
    });
  }
});
