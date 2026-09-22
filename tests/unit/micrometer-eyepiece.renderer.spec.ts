import { describe, expect, it, vi } from 'vitest';
import {
  initSleeve,
  createThimbleTicks
} from '../../src/instruments/micrometer-eyepiece/renderer/scales';
import { createStripeUpdater } from '../../src/instruments/micrometer-eyepiece/renderer/stripes';
import { createViewRenderer } from '../../src/instruments/micrometer-eyepiece/renderer/render-view';
import { bindInteractions } from '../../src/instruments/micrometer-eyepiece/renderer/interactions';
import type {
  MicrometerConfig,
  MicrometerViewState,
  StripeConfig
} from '../../src/instruments/micrometer-eyepiece/renderer/types';
import { createMicrometerEyepieceView } from '../../src/instruments/micrometer-eyepiece/instrument.view';
import { createMicrometerEyepieceSim } from '../../src/instruments/micrometer-eyepiece/instrument.sim';
import { micrometerEyepieceMeta } from '../../src/instruments/micrometer-eyepiece/instrument.meta';

const CONFIG: MicrometerConfig = {
  initialReading: 0,
  maxReading: 32,
  tickGapX: 10,
  tickGapY: 12
};

const STRIPE: StripeConfig = {
  offset: 12,
  spacing: 50,
  color: 'rgba(200, 80, 20, 0.4)',
  angle: 90
};

function createViewState(overrides: Partial<MicrometerViewState> = {}) {
  const state: MicrometerViewState = {
    crosshairSpeed: 100,
    currentReading: 0,
    zeroOffset: 0,
    viewMode: 'fringe',
    disposed: false,
    simLastCrosshairAngle: 0,
    sysX: 0,
    sysY: 0,
    systemScale: 1.5,
    ...overrides
  };
  return state;
}

function createHost() {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const canvas = document.createElement('canvas');
  parent.appendChild(canvas);
  return { parent, canvas };
}

describe('micrometer-eyepiece renderer', () => {
  describe('initSleeve', () => {
    it('creates one tick per 0.5mm plus end tick, sized by config', () => {
      const sleeveContainer = document.createElement('div');
      const sleeveScales = document.createElement('div');
      initSleeve(CONFIG, sleeveContainer, sleeveScales);

      // totalHalfMm = 32 / 0.5 = 64 → 65 个刻度，容器宽 64*10+60
      const ticks = sleeveScales.querySelectorAll('.sleeve-tick');
      expect(ticks).toHaveLength(65);
      expect(sleeveContainer.style.width).toBe('700px');

      const numbers = sleeveScales.querySelectorAll('.sleeve-number');
      // 每 5mm 一个数字：0,5,10,15,20,25,30
      expect(numbers).toHaveLength(7);
      expect(Array.from(numbers).map((n) => n.textContent)).toEqual([
        '0',
        '5',
        '10',
        '15',
        '20',
        '25',
        '30'
      ]);

      const first = ticks[0] as HTMLDivElement;
      expect(first.classList.contains('major')).toBe(true);
      expect(first.classList.contains('numbered')).toBe(true);
      expect(first.style.left).toBe('0px');

      const halfMm = ticks[1] as HTMLDivElement;
      expect(halfMm.classList.contains('minor')).toBe(true);
      expect(halfMm.style.left).toBe('10px');
    });
  });

  describe('createThimbleTicks', () => {
    it('initThimble fills a 40-tick object pool', () => {
      const thimbleStrip = document.createElement('div');
      const manager = createThimbleTicks({ thimbleStrip, config: CONFIG });
      manager.initThimble();
      expect(thimbleStrip.querySelectorAll('.thimble-tick')).toHaveLength(40);
    });

    it('updateThimbleTicks centers the pool on the current reading', () => {
      const thimbleStrip = document.createElement('div');
      const manager = createThimbleTicks({ thimbleStrip, config: CONFIG });
      manager.initThimble();
      manager.updateThimbleTicks(1.0);

      const ticks = Array.from(
        thimbleStrip.querySelectorAll('.thimble-tick')
      ) as HTMLDivElement[];
      // totalTicksPassed = 100 → centerTick = 100 → 覆盖 80..119
      const visible = ticks.filter((t) => t.style.display !== 'none');
      expect(visible).toHaveLength(40);
      expect(visible[0].style.bottom).toBe(`${80 * CONFIG.tickGapY}px`);
      expect(visible[39].style.bottom).toBe(`${119 * CONFIG.tickGapY}px`);

      // 每 5 格一个 major tick，数字为 tickIndex % 50（80..119 → 30..45,0..15）
      const numbers = visible
        .map((t) => t.querySelector('.thimble-number') as HTMLDivElement)
        .filter((n) => n.style.display !== 'none');
      expect(numbers.map((n) => n.innerText)).toEqual([
        '30',
        '35',
        '40',
        '45',
        '0',
        '5',
        '10',
        '15'
      ]);
    });

    it('hides ticks below index 0 and above index 2999', () => {
      const thimbleStrip = document.createElement('div');
      const manager = createThimbleTicks({ thimbleStrip, config: CONFIG });
      manager.initThimble();

      manager.updateThimbleTicks(0);
      let ticks = Array.from(
        thimbleStrip.querySelectorAll('.thimble-tick')
      ) as HTMLDivElement[];
      // centerTick = 0 → 索引 -20..19，负索引隐藏
      expect(ticks.filter((t) => t.style.display === 'none')).toHaveLength(20);

      manager.updateThimbleTicks(29.99);
      ticks = Array.from(
        thimbleStrip.querySelectorAll('.thimble-tick')
      ) as HTMLDivElement[];
      // centerTick = 2999 → 索引 2979..3018，>=3000 隐藏
      const hidden = ticks.filter((t) => t.style.display === 'none');
      expect(hidden).toHaveLength(19);
      const visible = ticks.filter((t) => t.style.display !== 'none');
      expect(visible[visible.length - 1].style.bottom).toBe(
        `${2999 * CONFIG.tickGapY}px`
      );
    });

    it('skips updates smaller than half a tick (0.005mm dirty check)', () => {
      const thimbleStrip = document.createElement('div');
      const manager = createThimbleTicks({ thimbleStrip, config: CONFIG });
      manager.initThimble();
      manager.updateThimbleTicks(1.0);

      const ticks = Array.from(
        thimbleStrip.querySelectorAll('.thimble-tick')
      ) as HTMLDivElement[];
      const before = ticks.map((t) => t.style.bottom);

      // 0.004mm < 0.005mm → 跳过重算
      manager.updateThimbleTicks(1.004);
      expect(ticks.map((t) => t.style.bottom)).toEqual(before);

      // 0.02mm → 重算，中心刻度 +2
      manager.updateThimbleTicks(1.02);
      const after = ticks.map((t) => t.style.bottom);
      expect(after).not.toEqual(before);
      expect(ticks[0].style.bottom).toBe(`${82 * CONFIG.tickGapY}px`);
    });
  });

  describe('createStripeUpdater', () => {
    it('uses a canvas tile with repeat for 90° stripes', () => {
      const lensView = document.createElement('div');
      const update = createStripeUpdater(lensView);
      update({ ...STRIPE, angle: 90 });
      expect(lensView.style.backgroundImage).toContain('data:image/png');
      expect(lensView.style.backgroundRepeat).toBe('repeat');
    });

    it('falls back to CSS gradient (no canvas tile) for tilted stripes', () => {
      const createSpy = vi.spyOn(document, 'createElement');
      const lensView = document.createElement('div');
      const update = createStripeUpdater(lensView);

      // 90°：Canvas 位图瓷砖
      createSpy.mockClear();
      update({ ...STRIPE, angle: 90 });
      expect(createSpy.mock.calls.some(([tag]) => tag === 'canvas')).toBe(true);
      expect(lensView.style.backgroundRepeat).toBe('repeat');

      // 倾斜角：走 repeating-linear-gradient 分支，不再创建 canvas
      // （happy-dom 会丢弃含 color-mix 的 gradient 赋值，因此以行为断言为准）
      createSpy.mockClear();
      update({ ...STRIPE, angle: 45 });
      expect(createSpy.mock.calls.some(([tag]) => tag === 'canvas')).toBe(
        false
      );
      expect(lensView.style.backgroundRepeat).toBe('');
      createSpy.mockRestore();
    });
  });

  describe('createViewRenderer', () => {
    function setup(overrides: Partial<MicrometerViewState> = {}) {
      const viewState = createViewState(overrides);
      const elements = {
        thimbleGroup: document.createElement('div'),
        thimbleStrip: document.createElement('div'),
        crosshairSystem: document.createElement('div'),
        lensView: document.createElement('div'),
        readoutDisplay: document.createElement('div') as HTMLDivElement | null
      };
      const listeners = {
        reading: [] as Array<(reading: number) => void>,
        align: [] as Array<() => void>,
        limit: [] as Array<() => void>
      };
      const updateThimbleTicks = vi.fn();
      const renderView = createViewRenderer({
        viewState,
        config: CONFIG,
        stripeConfig: { ...STRIPE },
        elements,
        listeners,
        updateThimbleTicks
      });
      return { viewState, elements, listeners, updateThimbleTicks, renderView };
    }

    it('clamps currentReading into [0, maxReading]', () => {
      const { viewState, renderView } = setup({ currentReading: 99 });
      renderView();
      expect(viewState.currentReading).toBe(32);

      viewState.currentReading = -5;
      renderView();
      expect(viewState.currentReading).toBe(0);
    });

    it('positions the thimble group: 0.5mm per tickGapX', () => {
      const { elements, renderView } = setup({ currentReading: 1.0 });
      renderView();
      // moveX = (1.0 / 0.5) * 10 = 20px
      expect(elements.thimbleGroup.style.transform).toBe('translateX(20px)');
    });

    it('scrolls the thimble strip: 0.01mm per tickGapY, offset by 90px', () => {
      const { elements, renderView } = setup({ currentReading: 0.5 });
      renderView();
      // totalTicks = 50 → targetY = 50*12 = 600 → translateY = 600-90
      expect(elements.thimbleStrip.style.transform).toBe('translateY(510px)');
    });

    it('calls updateThimbleTicks with the clamped reading', () => {
      const { updateThimbleTicks, renderView } = setup({
        currentReading: 2.345
      });
      renderView();
      expect(updateThimbleTicks).toHaveBeenCalledWith(2.345);
    });

    it('fringe mode scrolls stripes and keeps the crosshair centered', () => {
      const { elements, renderView } = setup({
        currentReading: 0.12,
        viewMode: 'fringe'
      });
      renderView();
      // viewOffset = (0.12 - 0 - 12) * 100 = -1188 → positionX = 1188px
      expect(elements.lensView.style.backgroundPositionX).toBe('1188px');
      expect(elements.crosshairSystem.style.transform).toBe(
        'translateX(0) rotate(0deg)'
      );
    });

    it('crosshair mode fixes stripes and translates the crosshair', () => {
      const { elements, renderView } = setup({
        currentReading: 0.12,
        viewMode: 'crosshair'
      });
      renderView();
      expect(elements.lensView.style.backgroundPositionX).toBe('0px');
      expect(elements.crosshairSystem.style.transform).toBe(
        'translateX(-1188px) rotate(0deg)'
      );
    });

    it('writes totalReading = reading + zeroOffset to the readout', () => {
      const { elements, renderView } = setup({
        currentReading: 5.678,
        zeroOffset: 0.002
      });
      renderView();
      expect(elements.readoutDisplay!.innerText).toBe('5.680 mm');
    });

    it('works without a readout display', () => {
      const { elements, renderView } = setup({ currentReading: 1 });
      elements.readoutDisplay = null;
      expect(() => renderView()).not.toThrow();
    });

    it('fires onAlign edge-triggered when the crosshair hits a stripe center', () => {
      const { viewState, listeners, renderView } = setup({
        currentReading: 12.0 // viewOffset = (12-0-12)*100 = 0 → 正好对准条纹中心
      });
      const alignSpy = vi.fn();
      listeners.align.push(alignSpy);

      renderView();
      expect(alignSpy).toHaveBeenCalledTimes(1);

      // 保持对准状态重渲染：不重复触发
      renderView();
      expect(alignSpy).toHaveBeenCalledTimes(1);

      // 移开：viewOffset = 25 → 距条纹中心 25px ≥ 2px
      viewState.currentReading = 12.25;
      renderView();
      expect(alignSpy).toHaveBeenCalledTimes(1);

      // 再次对准：viewOffset = 50 → 相邻条纹中心
      viewState.currentReading = 12.5;
      renderView();
      expect(alignSpy).toHaveBeenCalledTimes(2);
    });

    it('fires onLimit edge-triggered at both range ends', () => {
      const { viewState, listeners, renderView } = setup({
        currentReading: 1
      });
      const limitSpy = vi.fn();
      listeners.limit.push(limitSpy);

      renderView();
      expect(limitSpy).not.toHaveBeenCalled();

      viewState.currentReading = 32;
      renderView();
      expect(limitSpy).toHaveBeenCalledTimes(1);
      renderView();
      expect(limitSpy).toHaveBeenCalledTimes(1); // 停留限位不重复触发

      viewState.currentReading = 1;
      renderView();
      viewState.currentReading = 0;
      renderView();
      expect(limitSpy).toHaveBeenCalledTimes(2);
    });

    it('does nothing after dispose', () => {
      const { viewState, elements, renderView } = setup({
        currentReading: 5
      });
      viewState.disposed = true;
      renderView();
      expect(elements.thimbleGroup.style.transform).toBe('');
    });
  });

  describe('bindInteractions', () => {
    function setup(overrides: Partial<MicrometerViewState> = {}) {
      const viewState = createViewState(overrides);
      const elements = {
        thimbleGroup: document.createElement('div'),
        caseEl: document.createElement('div'),
        systemEl: document.createElement('div')
      };
      document.body.appendChild(elements.thimbleGroup);
      document.body.appendChild(elements.caseEl);
      document.body.appendChild(elements.systemEl);
      const renderView = vi.fn();
      const emitReading = vi.fn();
      const unbind = bindInteractions({
        viewState,
        config: CONFIG,
        elements,
        renderView,
        emitReading
      });
      return { viewState, elements, renderView, emitReading, unbind };
    }

    it('wheel adjusts the reading by 0.01mm per notch', () => {
      const { viewState, elements, renderView, emitReading, unbind } = setup({
        currentReading: 1
      });
      elements.thimbleGroup.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 100, cancelable: true })
      );
      expect(viewState.currentReading).toBeCloseTo(1.01, 10);
      expect(renderView).toHaveBeenCalledTimes(1);
      expect(emitReading).toHaveBeenCalledTimes(1);

      elements.thimbleGroup.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -100, cancelable: true })
      );
      expect(viewState.currentReading).toBeCloseTo(1.0, 10);
      unbind();
    });

    it('wheel clamps at 0 and does not emit when value is unchanged', () => {
      const { viewState, elements, renderView, emitReading, unbind } = setup({
        currentReading: 0
      });
      elements.thimbleGroup.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -100, cancelable: true })
      );
      expect(viewState.currentReading).toBe(0);
      expect(renderView).not.toHaveBeenCalled();
      expect(emitReading).not.toHaveBeenCalled();
      unbind();
    });

    it('thimble drag converts pointer delta to reading via config gaps', () => {
      const { viewState, elements, emitReading, unbind } = setup({
        currentReading: 2
      });
      elements.thimbleGroup.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: 100,
          clientY: 100
        })
      );
      // dx=18 → 18/1.8/10*0.5 = 0.5mm；dy=36 → 36/1.8/12*0.01 ≈ 0.0167mm
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 118,
          clientY: 136
        })
      );
      expect(viewState.currentReading).toBeCloseTo(2 + 0.5 + 36 / 2160, 6);
      expect(emitReading).toHaveBeenCalled();

      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      const frozen = viewState.currentReading;
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 500,
          clientY: 500
        })
      );
      expect(viewState.currentReading).toBe(frozen);
      unbind();
    });

    it('thimble drag clamps at maxReading', () => {
      const { viewState, elements, unbind } = setup({ currentReading: 31.9 });
      elements.thimbleGroup.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: 0, clientY: 0 })
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 10000,
          clientY: 0
        })
      );
      expect(viewState.currentReading).toBe(32);
      unbind();
    });

    it('keyboard: arrows step 0.01, PageUp/Down 0.1, Home/End jump to ends', () => {
      const { viewState, elements, unbind } = setup({ currentReading: 5 });
      const press = (key: string) =>
        elements.thimbleGroup.dispatchEvent(
          new KeyboardEvent('keydown', { key, cancelable: true })
        );

      press('ArrowRight');
      expect(viewState.currentReading).toBeCloseTo(5.01, 10);
      press('ArrowLeft');
      expect(viewState.currentReading).toBeCloseTo(5.0, 10);
      press('PageUp');
      expect(viewState.currentReading).toBeCloseTo(5.1, 10);
      press('PageDown');
      expect(viewState.currentReading).toBeCloseTo(5.0, 10);
      press('End');
      expect(viewState.currentReading).toBe(32);
      expect(elements.thimbleGroup.getAttribute('aria-valuenow')).toBe(
        '32.000'
      );
      expect(elements.thimbleGroup.getAttribute('aria-valuetext')).toBe(
        '32.000 mm'
      );
      press('Home');
      expect(viewState.currentReading).toBe(0);
      press('ArrowLeft'); // 低于 0 被钳制，无变化
      expect(viewState.currentReading).toBe(0);
      unbind();
    });

    it('ignores unrelated keys', () => {
      const { viewState, elements, renderView, unbind } = setup({
        currentReading: 1
      });
      elements.thimbleGroup.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'a', cancelable: true })
      );
      expect(viewState.currentReading).toBe(1);
      expect(renderView).not.toHaveBeenCalled();
      unbind();
    });

    it('case drag pans the whole instrument', () => {
      const { viewState, elements, unbind } = setup();
      elements.caseEl.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 })
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 40, clientY: 0 })
      );
      expect(viewState.sysX).toBe(30);
      expect(viewState.sysY).toBe(-10);
      expect(elements.systemEl.style.transform).toBe(
        'translate(30px, -10px) scale(1.5)'
      );
      unbind();
    });

    it('normalizes thimble and case drag deltas by ancestor stage zoom (k=2)', () => {
      const { viewState, elements, unbind } = setup({ currentReading: 2 });
      const viewport = document.createElement('div');
      viewport.dataset.stageZoom = '2';
      viewport.append(
        elements.thimbleGroup,
        elements.caseEl,
        elements.systemEl
      );
      document.body.appendChild(viewport);

      // 读数拖拽：屏幕 +36px → 局部 18px → 18/1.8/10*0.5 = 0.5mm
      elements.thimbleGroup.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: 100,
          clientY: 100
        })
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 136,
          clientY: 100
        })
      );
      expect(viewState.currentReading).toBeCloseTo(2.5, 10);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      // 整机拖拽：屏幕 (+60, +40) → 局部 (+30, +20)
      elements.caseEl.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: 0, clientY: 0 })
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 60, clientY: 40 })
      );
      expect(viewState.sysX).toBe(30);
      expect(viewState.sysY).toBe(20);
      expect(elements.systemEl.style.transform).toBe(
        'translate(30px, 20px) scale(1.5)'
      );
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      unbind();
      viewport.remove();
    });

    it('does not case-drag on a narrow host so the viewport can pan', () => {
      const { viewState, elements, unbind } = setup();
      const root = document.createElement('div');
      root.className = 'micrometer-root is-narrow';
      root.appendChild(elements.caseEl);
      document.body.appendChild(root);
      elements.caseEl.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 })
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 40, clientY: 0 })
      );
      expect(viewState.sysX).toBe(0);
      expect(viewState.sysY).toBe(0);
      unbind();
    });

    it('case arrow keys pan by 30px per press', () => {
      const { viewState, elements, unbind } = setup();
      elements.caseEl.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true })
      );
      elements.caseEl.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true })
      );
      expect(viewState.sysX).toBe(-30);
      expect(viewState.sysY).toBe(-30);
      unbind();
    });

    it('unbind removes all listeners', () => {
      const { viewState, elements, unbind } = setup({ currentReading: 1 });
      unbind();
      elements.thimbleGroup.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 100, cancelable: true })
      );
      expect(viewState.currentReading).toBe(1);
    });
  });

  describe('instrument view', () => {
    it('hides the canvas, mounts shadow DOM, and restores canvas on dispose', () => {
      const { parent, canvas } = createHost();
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      expect(canvas.style.display).toBe('none');
      const wrapper = parent.querySelector('div[style*="absolute"]')!;
      expect(
        wrapper.shadowRoot!.getElementById('thimble-group')
      ).not.toBeNull();
      expect((wrapper as HTMLElement).dataset.instrumentScroll).toBe('true');
      view.dispose();
      expect(canvas.style.display).toBe('');
      expect(wrapper.parentElement).toBeNull();
    });

    it('narrow resize left-aligns the system and enables a horizontal viewport', () => {
      const { parent, canvas } = createHost();
      parent.getBoundingClientRect = () =>
        ({
          left: 0,
          right: 360,
          top: 0,
          bottom: 180,
          width: 360,
          height: 180,
          x: 0,
          y: 0,
          toJSON() {
            return {};
          }
        }) as DOMRect;
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 375
      });
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      view.resize();
      const wrapper = parent.querySelector(
        '[data-instrument-scroll="true"]'
      ) as HTMLElement;
      const root = wrapper.shadowRoot!.querySelector(
        '.micrometer-root'
      ) as HTMLElement;
      const system = wrapper.shadowRoot!.querySelector(
        '.micrometer-system'
      ) as HTMLElement;
      expect(root.classList.contains('is-narrow')).toBe(true);
      expect(wrapper.style.overflowX).toMatch(/auto|scroll/);
      expect(system.style.transform).toContain('translate(0px, 0px)');
      expect(system.style.transform).toContain('scale(1)');
      expect(
        wrapper.shadowRoot!.querySelector('[data-instrument-pan="true"]')
      ).not.toBeNull();
      expect(root.style.transform).toMatch(/scale\(/);
      view.dispose();
    });

    it('tablet-narrow resize does not collapse when the host height is a sliver', () => {
      const { parent, canvas } = createHost();
      parent.getBoundingClientRect = () =>
        ({
          left: 0,
          right: 639,
          top: 0,
          bottom: 24,
          width: 639,
          height: 24,
          x: 0,
          y: 0,
          toJSON() {
            return {};
          }
        }) as DOMRect;
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 639
      });
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      view.resize();
      const wrapper = parent.querySelector(
        '[data-instrument-scroll="true"]'
      ) as HTMLElement;
      const root = wrapper.shadowRoot!.querySelector(
        '.micrometer-root'
      ) as HTMLElement;
      expect(root.classList.contains('is-narrow')).toBe(true);
      const match = /scale\(([^)]+)\)/.exec(root.style.transform);
      expect(match).toBeTruthy();
      expect(Number(match![1])).toBeGreaterThanOrEqual(0.3);
      expect(Number(match![1])).toBeCloseTo(1, 5);
      view.dispose();
    });

    it('throws when canvas has no parent element', () => {
      const canvas = document.createElement('canvas');
      expect(() =>
        createMicrometerEyepieceView({ canvas, theme: 'dark' })
      ).toThrow('canvas must have a parent element');
    });

    it('getReading = currentReading + zeroOffset via calibration API', () => {
      const { canvas } = createHost();
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      // 初始读数取自 meta.defaultParams，与 sim 保持一致
      expect(view.getReading()).toBe(
        micrometerEyepieceMeta.defaultParams.initialReading
      );
      view.setZero(-0.03);
      expect(view.getReading()).toBeCloseTo(-0.03, 10);
      expect(view.getZero()).toBe(-0.03);
      expect(view.getCalibrationOffset()).toBe(-0.03);
      view.dispose();
    });

    it('render(state) applies zero offset and view mode from the sim', () => {
      const { parent, canvas } = createHost();
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      const sim = createMicrometerEyepieceSim(
        micrometerEyepieceMeta.defaultParams
      );

      sim.setParams({ zeroOffset: 0.5, viewMode: 'crosshair' });
      view.render(sim.getState());
      expect(view.getReading()).toBeCloseTo(0.5, 10);

      const shadow = parent.querySelector(
        'div[style*="absolute"]'
      )!.shadowRoot!;
      const hint = shadow.getElementById('hint-text')!;
      expect(hint.textContent).toContain('移动准星');

      sim.setParams({ viewMode: 'fringe' });
      view.render(sim.getState());
      expect(hint.textContent).toContain('移动条纹');
      view.dispose();
    });

    it('render(state) toggles scale-inverted class on the sleeve', () => {
      const { parent, canvas } = createHost();
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      const sim = createMicrometerEyepieceSim(
        micrometerEyepieceMeta.defaultParams
      );

      sim.setParams({ scaleInverted: true });
      view.render(sim.getState());
      const shadow = parent.querySelector(
        'div[style*="absolute"]'
      )!.shadowRoot!;
      const sleeveContainer = shadow.querySelector('.sleeve-container')!;
      expect(sleeveContainer.classList.contains('scale-inverted')).toBe(true);

      sim.setParams({ scaleInverted: false });
      view.render(sim.getState());
      expect(sleeveContainer.classList.contains('scale-inverted')).toBe(false);
      view.dispose();
    });

    it('render(state) rebuilds stripes when spacing/color/angle change', () => {
      const { parent, canvas } = createHost();
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      const sim = createMicrometerEyepieceSim(
        micrometerEyepieceMeta.defaultParams
      );

      const shadow = parent.querySelector(
        'div[style*="absolute"]'
      )!.shadowRoot!;
      const lensView = shadow.getElementById('lens-view')!;
      expect(lensView.style.backgroundImage).toContain('data:image/png');

      // 间距变化（仍为 90°）→ 重新生成 Canvas 瓷砖
      const createSpy = vi.spyOn(document, 'createElement');
      sim.setParams({ stripeSpacing: 80 });
      view.render(sim.getState());
      expect(createSpy.mock.calls.some(([tag]) => tag === 'canvas')).toBe(true);

      // 角度变为倾斜 → 走 CSS gradient 分支，不再创建 canvas
      createSpy.mockClear();
      sim.setParams({ stripeAngle: 45 });
      view.render(sim.getState());
      expect(createSpy.mock.calls.some(([tag]) => tag === 'canvas')).toBe(
        false
      );
      createSpy.mockRestore();
      view.dispose();
    });

    it('serialize/deserialize round-trips and clamps out-of-range values', () => {
      const { canvas } = createHost();
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      view.setZero(0.1);
      const json = view.serialize();
      const data = JSON.parse(json) as Record<string, unknown>;
      expect(data.currentReading).toBe(0);
      expect(data.zeroOffset).toBe(0.1);
      expect(data.stripeSpacing).toBe(50);

      view.deserialize(
        JSON.stringify({
          currentReading: 99,
          zeroOffset: 5,
          stripeOffset: 99,
          stripeSpacing: 5,
          stripeAngle: 270
        })
      );
      const clamped = JSON.parse(view.serialize()) as Record<string, unknown>;
      expect(clamped.currentReading).toBe(32);
      expect(clamped.zeroOffset).toBe(0.5);
      expect(clamped.stripeOffset).toBe(32); // mm，钳制到 maxReading
      expect(clamped.stripeSpacing).toBe(20);
      expect(clamped.stripeAngle).toBe(180);

      expect(() => view.deserialize('not json')).not.toThrow();
      view.dispose();
    });

    it('emits reading changes from wheel interaction', () => {
      const { parent, canvas } = createHost();
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      const readings: number[] = [];
      view.onReadingChange((r) => readings.push(r));

      const thimble = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('thimble-group')!;
      thimble.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 100, cancelable: true })
      );
      expect(readings).toHaveLength(1);
      expect(readings[0]).toBeCloseTo(0.01, 10);
      expect(view.getReading()).toBeCloseTo(0.01, 10);
      view.dispose();
    });

    it('sets slider accessibility attributes on the thimble', () => {
      const { parent, canvas } = createHost();
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      const thimble = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('thimble-group')!;
      expect(thimble.getAttribute('role')).toBe('slider');
      expect(thimble.getAttribute('aria-valuemin')).toBe('0');
      expect(thimble.getAttribute('aria-valuemax')).toBe('32');
      expect(thimble.getAttribute('aria-valuenow')).toBe('0.000');
      view.dispose();
    });

    it('showHints=false hides the hint element', () => {
      const { parent, canvas } = createHost();
      const view = createMicrometerEyepieceView({
        canvas,
        theme: 'dark',
        showHints: false
      });
      const hint = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('hint-text')!;
      expect(hint.style.display).toBe('none');
      view.dispose();
    });

    it('setReadoutVisible toggles the readout, which receives live readings', () => {
      const { parent, canvas } = createHost();
      const view = createMicrometerEyepieceView({ canvas, theme: 'dark' });
      const readout = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('readout-display')!;
      // 默认隐藏（与 interference 版一致：读数由宿主场景统一显示）
      expect(readout.style.display).toBe('none');
      // 启动时 renderView 已写入当前读数
      expect(readout.innerText).toBe('0.000 mm');

      view.setReadoutVisible(true);
      expect(readout.style.display).toBe('');

      view.setZero(0.5);
      expect(readout.innerText).toBe('0.500 mm');

      view.setReadoutVisible(false);
      expect(readout.style.display).toBe('none');
      view.dispose();
    });
  });
});
