import { describe, expect, it, vi } from 'vitest';
import {
  UNIT_PX,
  MAIN_SUB_TICK_PX,
  VERNIER_DIVISIONS,
  VERNIER_LENGTH_PX,
  VERNIER_SUB_TICK_PX,
  LEAST_COUNT_PX,
  MAX_CM,
  MAX_X,
  PATTERN_ABSOLUTE_X
} from '../../src/instruments/interference-vernier-caliper/renderer/constants';
import {
  initMainRuler,
  initVernier
} from '../../src/instruments/interference-vernier-caliper/renderer/ticks';
import {
  parseRgba,
  buildStripeTile
} from '../../src/instruments/interference-vernier-caliper/renderer/stripes';
import {
  attachInteractions,
  createInteractionState,
  type InteractionElements
} from '../../src/instruments/interference-vernier-caliper/renderer/interactions';
import { createInterferenceVernierCaliperView } from '../../src/instruments/interference-vernier-caliper/instrument.view';
import { createInterferenceVernierCaliperSim } from '../../src/instruments/interference-vernier-caliper/instrument.sim';
import { interferenceVernierCaliperMeta } from '../../src/instruments/interference-vernier-caliper/instrument.meta';

function createHost() {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const canvas = document.createElement('canvas');
  parent.appendChild(canvas);
  return { parent, canvas };
}

describe('interference-vernier-caliper renderer', () => {
  describe('constants', () => {
    it('keeps physical-to-pixel relations consistent', () => {
      expect(MAIN_SUB_TICK_PX).toBeCloseTo(UNIT_PX / 10, 10);
      expect(VERNIER_SUB_TICK_PX).toBeCloseTo(
        VERNIER_LENGTH_PX / VERNIER_DIVISIONS,
        10
      );
      // 最小刻度 = 主尺分度 - 游标分度
      expect(MAIN_SUB_TICK_PX - VERNIER_SUB_TICK_PX).toBeCloseTo(
        LEAST_COUNT_PX,
        10
      );
      expect(MAX_X).toBeCloseTo(MAX_CM * UNIT_PX, 10);
      expect(PATTERN_ABSOLUTE_X).toBeCloseTo(1.5 * UNIT_PX, 10);
    });

    it('least count corresponds to 0.002 cm precision', () => {
      expect(LEAST_COUNT_PX / UNIT_PX).toBeCloseTo(0.002, 10);
    });
  });

  describe('ticks', () => {
    it('initMainRuler creates 71 ticks with 7 cm labels', () => {
      const container = document.createElement('div');
      initMainRuler(container);

      const ticks = container.querySelectorAll('.tick');
      const labels = container.querySelectorAll('.tick-label');
      expect(ticks).toHaveLength(71); // 0..70 个 0.1cm 刻度
      expect(labels).toHaveLength(8); // 0,1,...,7 cm

      const firstTick = ticks[0] as HTMLDivElement;
      expect(firstTick.style.left).toBe('0px');
      expect(firstTick.style.height).toBe('18px'); // 整厘米主刻度

      const fifthTick = ticks[5] as HTMLDivElement;
      expect(fifthTick.style.left).toBe(`${5 * MAIN_SUB_TICK_PX}px`);
      expect(fifthTick.style.height).toBe('12px'); // 半厘米刻度

      const thirdTick = ticks[3] as HTMLDivElement;
      expect(thirdTick.style.height).toBe('7px'); // 普通 0.1cm 刻度

      expect((labels[7] as HTMLDivElement).innerText).toBe('7');
    });

    it('initVernier creates 51 ticks with 11 labels, last label wraps to 0', () => {
      const container = document.createElement('div');
      initVernier(container);

      const ticks = container.querySelectorAll('.vernier-tick');
      const labels = container.querySelectorAll('.vernier-tick-label');
      expect(ticks).toHaveLength(51); // 0..50 分度
      expect(labels).toHaveLength(11); // 每 5 分度一个数字

      const lastTick = ticks[50] as HTMLDivElement;
      expect(parseFloat(lastTick.style.left)).toBeCloseTo(
        50 * VERNIER_SUB_TICK_PX,
        6
      );

      const texts = Array.from(labels).map(
        (l) => (l as HTMLDivElement).innerText
      );
      expect(texts).toEqual([
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '0' // 50 分度处回绕为 0
      ]);

      const minorTick = ticks[1] as HTMLDivElement;
      expect(minorTick.style.height).toBe('6px');
      const majorTick = ticks[10] as HTMLDivElement;
      expect(majorTick.style.height).toBe('12px');
    });
  });

  describe('stripes', () => {
    it('parseRgba parses rgba() with alpha', () => {
      expect(parseRgba('rgba(200, 80, 20, 0.4)')).toEqual({
        r: 200,
        g: 80,
        b: 20,
        a: 0.4
      });
    });

    it('parseRgba defaults alpha to 1 for rgb()', () => {
      expect(parseRgba('rgb(10, 20, 30)')).toEqual({
        r: 10,
        g: 20,
        b: 30,
        a: 1
      });
    });

    it('parseRgba falls back to opaque black for unparseable colors', () => {
      expect(parseRgba('not-a-color')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it('buildStripeTile returns a png data URL tile of one period', () => {
      const url = buildStripeTile(16, 'rgba(30,15,0,0.85)');
      expect(url.startsWith('data:image/png')).toBe(true);
    });
  });

  describe('createInteractionState', () => {
    it('centers the instrument when parent is large enough', () => {
      const parent = document.createElement('div');
      parent.getBoundingClientRect = () =>
        ({
          width: 2000,
          height: 800
        }) as DOMRect;
      const state = createInteractionState(parent);
      // scaledW = 695*2 = 1390, scaledH = 250*2 = 500
      expect(state.sysX).toBe(Math.round((2000 - 1390) / 2));
      expect(state.sysY).toBe(Math.round((800 - 500) / 2));
      // 初始读数取自 meta.defaultParams，与 sim 保持一致
      expect(state.currentReadingCm).toBe(
        interferenceVernierCaliperMeta.defaultParams.initialReading
      );
      expect(state.isDragging).toBe(false);
    });

    it('uses fallback offsets when parent rect is tiny', () => {
      const parent = document.createElement('div');
      parent.getBoundingClientRect = () => ({ width: 0, height: 0 }) as DOMRect;
      const state = createInteractionState(parent);
      expect(state.sysX).toBe(-100);
      expect(state.sysY).toBe(0);
    });
  });

  describe('attachInteractions', () => {
    function setup() {
      const slider = document.createElement('div');
      const knob = document.createElement('div');
      knob.id = 'knob';
      slider.appendChild(knob);
      const mainRuler = document.createElement('div');
      const instrumentEl = document.createElement('div');
      document.body.appendChild(slider);
      document.body.appendChild(mainRuler);
      document.body.appendChild(instrumentEl);

      const parent = document.createElement('div');
      parent.getBoundingClientRect = () => ({ width: 0, height: 0 }) as DOMRect;
      const state = createInteractionState(parent);
      const onReadingMoved = vi.fn();
      const elements: InteractionElements = {
        slider,
        knob,
        mainRuler,
        instrumentEl
      };
      const detach = attachInteractions(elements, state, onReadingMoved);
      return {
        slider,
        knob,
        mainRuler,
        instrumentEl,
        state,
        onReadingMoved,
        detach
      };
    }

    function mouse(
      target: HTMLElement | Document,
      type: string,
      clientX: number
    ) {
      target.dispatchEvent(
        new MouseEvent(type, { bubbles: true, clientX, cancelable: true })
      );
    }

    it('slider drag moves reading at half pointer speed (delta/2/UNIT_PX)', () => {
      const { slider, state, onReadingMoved, detach } = setup();
      mouse(slider, 'mousedown', 100);
      expect(state.isDragging).toBe(true);
      expect(state.dragMode).toBe('slider');

      // 192 px 位移 → 192/2/96 = 1 cm
      mouse(document, 'mousemove', 100 + 192);
      expect(state.currentReadingCm).toBeCloseTo(1.4 + 1, 10);
      expect(onReadingMoved).toHaveBeenCalled();
      detach();
    });

    it('knob drag applies 10:1 reduction ratio', () => {
      const { knob, state, detach } = setup();
      mouse(knob, 'mousedown', 100);
      expect(state.dragMode).toBe('knob');

      mouse(document, 'mousemove', 100 + 192);
      expect(state.currentReadingCm).toBeCloseTo(1.4 + 0.1, 10);
      detach();
    });

    it('knob mousedown stops propagation so slider mode is not triggered', () => {
      const { knob, state, detach } = setup();
      // knob 在 slider 内部，冒泡被 stopPropagation 阻断
      mouse(knob, 'mousedown', 50);
      expect(state.dragMode).toBe('knob');
      detach();
    });

    it('mouseup ends the drag and freezes the reading', () => {
      const { slider, state, detach } = setup();
      mouse(slider, 'mousedown', 0);
      mouse(document, 'mousemove', 96);
      const frozen = state.currentReadingCm;
      mouse(document, 'mouseup', 96);
      expect(state.isDragging).toBe(false);
      expect(state.dragMode).toBeNull();
      mouse(document, 'mousemove', 500);
      expect(state.currentReadingCm).toBe(frozen);
      detach();
    });

    it('ruler drag pans the whole instrument and updates transform', () => {
      const { mainRuler, instrumentEl, state, detach } = setup();
      const startX = state.sysX;
      mainRuler.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: 10 })
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 40 })
      );
      expect(state.sysX).toBe(startX + 30);
      expect(instrumentEl.style.transform).toBe(
        `translate(${state.sysX}px, ${state.sysY}px) scale(2)`
      );
      detach();
    });

    it('arrow keys pan the instrument by 30px per press', () => {
      const { mainRuler, state, detach } = setup();
      const x0 = state.sysX;
      const y0 = state.sysY;
      mainRuler.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight' })
      );
      mainRuler.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown' })
      );
      expect(state.sysX).toBe(x0 + 30);
      expect(state.sysY).toBe(y0 + 30);
      detach();
    });

    it('sets accessibility attributes on the main ruler', () => {
      const { mainRuler, detach } = setup();
      expect(mainRuler.tabIndex).toBe(0);
      expect(mainRuler.getAttribute('role')).toBe('button');
      expect(mainRuler.getAttribute('aria-label')).toContain('主刻度尺');
      detach();
    });

    it('detach removes all listeners', () => {
      const { slider, state, detach } = setup();
      detach();
      mouse(slider, 'mousedown', 0);
      expect(state.isDragging).toBe(false);
    });
  });

  describe('instrument view', () => {
    it('hides the canvas and mounts a shadow DOM wrapper', () => {
      const { parent, canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      expect(canvas.style.display).toBe('none');
      const wrapper = parent.querySelector('div[style*="absolute"]');
      expect(wrapper).not.toBeNull();
      expect(wrapper!.shadowRoot).not.toBeNull();
      view.dispose();
      expect(canvas.style.display).toBe('');
      expect(wrapper!.parentElement).toBeNull();
    });

    it('throws when canvas has no parent element', () => {
      const canvas = document.createElement('canvas');
      expect(() =>
        createInterferenceVernierCaliperView({ canvas, theme: 'dark' })
      ).toThrow('canvas must have a parent element');
    });

    it('getReading returns snapped reading plus zero offset', () => {
      const { canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      // 1.4 cm * 96 px = 134.4 px，恰好是最小刻度 0.192 px 的 700 倍，无需吸附
      expect(view.getReading()).toBeCloseTo(1.4, 10);
      view.setZero(0.05);
      expect(view.getReading()).toBeCloseTo(1.45, 10);
      expect(view.getZero()).toBe(0.05);
      expect(view.getCalibrationOffset()).toBe(0.05);
      view.dispose();
    });

    it('emits reading changes on slider drag with zero offset applied', () => {
      const { parent, canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      const readings: number[] = [];
      view.onReadingChange((r) => readings.push(r));
      view.setZero(0.01);

      const slider = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('slider')!;
      slider.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: 0 })
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 2 * UNIT_PX * 0.5 // +0.5 cm
        })
      );
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      expect(readings.length).toBeGreaterThan(0);
      expect(readings[readings.length - 1]).toBeCloseTo(1.9 + 0.01, 6);
      expect(view.getReading()).toBeCloseTo(1.91, 6);
      view.dispose();
    });

    it('fires onLimit only on entering the limit, not while staying there', () => {
      const { parent, canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      const limitSpy = vi.fn();
      view.onLimit(limitSpy);

      const slider = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('slider')!;
      // 拖过量程上限 → 读数被钳制到 MAX_CM
      slider.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: 0 })
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 10000 })
      );
      expect(limitSpy).toHaveBeenCalledTimes(1);
      expect(view.getReading()).toBeCloseTo(MAX_CM, 10);

      // 再次原地拖动：仍处限位，不重复触发
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 10050 })
      );
      expect(limitSpy).toHaveBeenCalledTimes(1);
      view.dispose();
    });

    it('unsubscribing removes reading listeners', () => {
      const { parent, canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      const spy = vi.fn();
      const off = view.onReadingChange(spy);
      off();

      const slider = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('slider')!;
      slider.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: 0 })
      );
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 96 })
      );
      expect(spy).not.toHaveBeenCalled();
      view.dispose();
    });

    it('serialize/deserialize round-trips reading, zero offset and position', () => {
      const { canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      view.setZero(0.02);
      const json = view.serialize();
      const data = JSON.parse(json) as Record<string, unknown>;
      expect(data.currentReading).toBeCloseTo(1.4, 10);
      expect(data.zeroOffset).toBe(0.02);

      view.deserialize(json);
      expect(view.getReading()).toBeCloseTo(1.42, 10);
      view.dispose();
    });

    it('deserialize clamps out-of-range values and ignores invalid JSON', () => {
      const { canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      view.deserialize(
        JSON.stringify({ currentReading: 99, zeroOffset: 5, fringeOpacity: 7 })
      );
      const data = JSON.parse(view.serialize()) as Record<string, unknown>;
      expect(data.currentReading).toBe(MAX_CM);
      expect(data.zeroOffset).toBe(0.5);
      expect(data.fringeOpacity).toBe(1);

      expect(() => view.deserialize('{broken')).not.toThrow();
      view.dispose();
    });

    it('render(state) rebuilds stripe tile with lens visual scale applied', () => {
      const { parent, canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      const sim = createInterferenceVernierCaliperSim(
        interferenceVernierCaliperMeta.defaultParams
      );
      sim.setParams({ fringeSpacing: 24 });
      view.render(sim.getState());
      // fringeConfig.spacing = round(24 * 1.2) = 29
      const data = JSON.parse(view.serialize()) as Record<string, unknown>;
      expect(data.fringeSpacing).toBe(29);

      const stripeLayer = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('stripe-layer')!;
      expect(stripeLayer.style.backgroundImage).toContain('data:image/png');
      view.dispose();
    });

    it('render(state) switches view mode between fringe and crosshair', () => {
      const { parent, canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      const sim = createInterferenceVernierCaliperSim(
        interferenceVernierCaliperMeta.defaultParams
      );

      const shadow = parent.querySelector(
        'div[style*="absolute"]'
      )!.shadowRoot!;
      const crosshair = shadow.getElementById('crosshair-system')!;
      const stripeLayer = shadow.getElementById('stripe-layer')!;

      sim.setParams({ viewMode: 'crosshair' });
      view.render(sim.getState());
      expect(crosshair.style.transform).toContain('translateX');
      expect(stripeLayer.style.backgroundPositionX).toBe('0px');

      sim.setParams({ viewMode: 'fringe' });
      view.render(sim.getState());
      expect(crosshair.style.transform).not.toContain('translateX');
      view.dispose();
    });

    it('render(state) re-renders when stripeOffset changes (dirty check)', () => {
      const { parent, canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      const sim = createInterferenceVernierCaliperSim(
        interferenceVernierCaliperMeta.defaultParams
      );
      const crosshair = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('crosshair-system')!;

      // 切入准星移动模式：快照参考读数 1.4cm，初始 stripeOffsetMm = 12mm
      view.render({ ...sim.getState(), viewMode: 'crosshair' });
      // vo = (14 - 14 - 12) * (96 * 1.2 / 10) = -138.24 → round → -138
      expect(crosshair.style.transform).toContain('translateX(-138px)');

      // stripeOffset 变化必须触发重渲染（修复前因先赋值后比较而永不触发）
      view.render({
        ...sim.getState(),
        viewMode: 'crosshair',
        stripeOffset: 20
      });
      // vo = -20 * 11.52 = -230.4 → round → -230
      expect(crosshair.style.transform).toContain('translateX(-230px)');
      view.dispose();
    });

    it('setReadoutVisible toggles the internal readout display', () => {
      const { parent, canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark'
      });
      const readout = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('readout')!;
      expect(readout.style.display).toBe('none'); // 默认隐藏
      view.setReadoutVisible(true);
      expect(readout.style.display).toBe('');
      view.setReadoutVisible(false);
      expect(readout.style.display).toBe('none');
      view.dispose();
    });

    it('showHints=false hides the tips element', () => {
      const { parent, canvas } = createHost();
      const view = createInterferenceVernierCaliperView({
        canvas,
        theme: 'dark',
        showHints: false
      });
      const tips = parent
        .querySelector('div[style*="absolute"]')!
        .shadowRoot!.getElementById('tips-text')!;
      expect(tips.style.display).toBe('none');
      view.dispose();
    });
  });
});
