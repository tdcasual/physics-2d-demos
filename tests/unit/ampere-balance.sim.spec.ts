import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applySceneUrlParams, writeSceneParams } from '../../src/app/url-sync';
import { createAmpereBalanceScene } from '../../src/scenes/ampere-balance/scene.entry';
import { ampereBalanceMeta } from '../../src/scenes/ampere-balance/scene.meta';
import {
  ampereBalancePresets,
  ampereBalanceUrlKeys,
  ampereBalanceUrlPayload,
  ampereBalanceUrlReset,
  ampereBalanceValues,
  ampereDirectionScreen,
  ampereForceMagnitude,
  applyAmpereBalanceUrlParam,
  BALANCE_B,
  BALANCE_I,
  createAmpereBalanceSim,
  formatFixed,
  encodeCurrentDirection,
  encodeFieldDirection,
  parseCurrentDirection,
  parseFieldDirection,
  fieldUnit,
  outwardNormalUnit,
  slopeUnit,
  SUPPORT_ZERO_B,
  type AmpereBalanceParams,
  type AmpereFieldDirection
} from '../../src/scenes/ampere-balance/scene.sim';

const defaults: AmpereBalanceParams = {
  inclineAngle: 30,
  magneticField: 1,
  current: 4.6,
  mass: 0.8,
  fieldDirection: 'down',
  currentDirection: 'out',
  autoRun: true
};

describe('ampere-balance simulation', () => {
  it('matches hand values for the cover default (B down, I out)', () => {
    // g=10, L=1, m=0.8 → G=8 N down. B=1, I=4.6 → Fₐ=BIL=4.6 N to the right.
    // s=(√3/2, 1/2), n=(1/2, −√3/2)
    // G·s=8×1/2=4; Fₐ·s=4.6×√3/2=3.9837; slopeNet=7.9837; a=9.9796
    // raw N = −(G+Fₐ)·n = 4√3 − 2.3 = 4.6282
    const values = ampereBalanceValues(defaults);
    expect(ampereForceMagnitude(defaults)).toBeCloseTo(4.6, 10);
    expect(values.ampereVector.x).toBeCloseTo(4.6, 6);
    expect(values.ampereVector.y).toBeCloseTo(0, 6);
    expect(values.weight).toBeCloseTo(8, 10);
    expect(values.slopeNet).toBeCloseTo(7.9837, 3);
    expect(values.acceleration).toBeCloseTo(9.9796, 3);
    expect(values.normalForce).toBeCloseTo(4.6282, 3);
    expect(values.trend).toBe('下滑趋势');
    expect(values.detached).toBe(false);
  });

  it('uses F = Iẑ × B in screen y-down coordinates', () => {
    const cases: Array<[AmpereFieldDirection, { x: number; y: number }]> = [
      ['up', { x: -1, y: 0 }],
      ['down', { x: 1, y: 0 }],
      ['right', { x: 0, y: -1 }],
      ['left', { x: 0, y: 1 }]
    ];
    for (const [dir, expected] of cases) {
      const b = fieldUnit(dir, 30);
      const out = ampereDirectionScreen(b, 'out');
      const inn = ampereDirectionScreen(b, 'in');
      expect(out.x).toBeCloseTo(expected.x, 10);
      expect(out.y).toBeCloseTo(expected.y, 10);
      expect(inn.x).toBeCloseTo(-expected.x, 10);
      expect(inn.y).toBeCloseTo(-expected.y, 10);
    }
    const theta = Math.PI / 6;
    const n = { x: Math.sin(theta), y: -Math.cos(theta) };
    const nUp = ampereDirectionScreen(n, 'out');
    expect(nUp.x).toBeCloseTo(-Math.cos(theta), 10);
    expect(nUp.y).toBeCloseTo(-Math.sin(theta), 10);
  });

  it('projects onto slope s=(cosθ,sinθ) and outward n=(sinθ,−cosθ)', () => {
    const s = slopeUnit(30);
    const n = outwardNormalUnit(30);
    expect(s.x).toBeCloseTo(Math.sqrt(3) / 2, 10);
    expect(s.y).toBeCloseTo(0.5, 10);
    expect(n.x).toBeCloseTo(0.5, 10);
    expect(n.y).toBeCloseTo(-Math.sqrt(3) / 2, 10);
    expect(s.x * n.x + s.y * n.y).toBeCloseTo(0, 10);
  });

  it('reverses Fₐ when current reverses', () => {
    const out = ampereBalanceValues(defaults);
    const inn = ampereBalanceValues({ ...defaults, currentDirection: 'in' });
    expect(out.ampereVector.x).toBeCloseTo(-inn.ampereVector.x, 10);
    expect(out.ampereVector.y).toBeCloseTo(-inn.ampereVector.y, 10);
  });

  it('balances G sinθ with slider-representable B=1.00 T and I=4.62 A', () => {
    // mg sin30=4 N; FA=BIL=4.62 N left; FA·s=4.62·√3/2=4.001
    expect(BALANCE_I).toBe(4.62);
    expect(ampereBalancePresets.balance.current).toBe(4.62);
    expect(ampereBalancePresets.balance.magneticField).toBe(1);
    const approx = ampereBalanceValues({
      ...defaults,
      ...ampereBalancePresets.balance
    });
    expect(approx.ampereVector.x).toBeLessThan(0);
    expect(approx.ampereVector.y).toBeCloseTo(0, 6);
    expect(Math.abs(approx.slopeNet)).toBeLessThan(0.005);
    expect(approx.frictionRequired).toBeCloseTo(Math.abs(approx.slopeNet), 10);
    expect(formatFixed(approx.frictionRequired)).toBe('0.00');
    expect(formatFixed(approx.acceleration)).toBe('0.00');
    expect(approx.trend).toBe('近似平衡');
    expect(approx.detached).toBe(false);
    const exact = ampereBalanceValues({
      ...defaults,
      fieldDirection: 'up',
      magneticField: BALANCE_B
    });
    expect(exact.slopeNet).toBeCloseTo(0, 6);
  });

  it('gives N≈0 when FA cancels weight (B right, I out)', () => {
    // FA up = mg = 8 N ⇒ B = 8/4.6
    expect(SUPPORT_ZERO_B).toBeCloseTo(8 / 4.6, 10);
    const values = ampereBalanceValues({
      ...defaults,
      ...ampereBalancePresets.supportZero
    });
    expect(values.ampereVector.x).toBeCloseTo(0, 6);
    expect(values.ampereVector.y).toBeCloseTo(-8, 2);
    expect(values.normalForce).toBeCloseTo(0, 6);
    expect(values.frictionRequired).toBe(0);
    expect(values.detached).toBe(false);
    expect(values.trend).toBe('近似平衡');
    expect(formatFixed(values.acceleration)).toBe('0.00');
    const scene = createAmpereBalanceScene();
    scene.setParams({ ...ampereBalancePresets.supportZero });
    const accel = scene
      .getReadoutItems()
      .find((item) => item.key === 'acceleration');
    expect(accel?.value.startsWith('-')).toBe(false);
    expect(accel?.value).toBe('0.00 m/s²');
    scene.dispose();
  });

  it('keeps the slider-quantized B=1.74 support-zero state in contact', () => {
    // Slider step 0.01 rounds 8/4.6≈1.73913 to 1.74 → FA=8.004 N
    // rawNormal ≈ −0.00346 N, inside contactEps=0.005
    const values = ampereBalanceValues({
      ...defaults,
      fieldDirection: 'right',
      currentDirection: 'out',
      magneticField: 1.74
    });
    expect(ampereBalancePresets.supportZero.magneticField).toBe(1.74);
    expect(values.rawNormal).toBeGreaterThan(-0.005);
    expect(values.rawNormal).toBeLessThan(0);
    expect(values.detached).toBe(false);
    expect(values.normalForce).toBe(0);
    expect(values.frictionRequired).toBe(0);
    expect(values.trend).toBe('近似平衡');
  });

  it('detaches when required N is negative and reports a∥ of free flight', () => {
    const values = ampereBalanceValues({
      ...defaults,
      ...ampereBalancePresets.detach
    });
    expect(values.rawNormal).toBeLessThan(0);
    expect(values.normalForce).toBe(0);
    expect(values.detached).toBe(true);
    expect(values.frictionRequired).toBe(0);
    // a∥ = (G+Fₐ)·s / m, also the parallel part of unconstrained a
    const s = slopeUnit(30);
    const ax = (values.weightVector.x + values.ampereVector.x) / defaults.mass;
    const ay = (values.weightVector.y + values.ampereVector.y) / defaults.mass;
    expect(values.acceleration).toBeCloseTo(ax * s.x + ay * s.y, 8);
  });

  it('clamps near-zero rawNormal so N=0 is not a detached band', () => {
    const barely = ampereBalanceValues({
      ...defaults,
      fieldDirection: 'right',
      magneticField: SUPPORT_ZERO_B
    });
    expect(barely.detached).toBe(false);
    expect(barely.normalForce).toBeCloseTo(0, 6);
    const lost = ampereBalanceValues({
      ...defaults,
      fieldDirection: 'right',
      magneticField: 2.4
    });
    expect(lost.detached).toBe(true);
    expect(lost.normalForce).toBe(0);
  });

  it('keeps the rod fixed as a static force diagram', () => {
    const sim = createAmpereBalanceSim();
    const before = sim.getState();
    expect('blockOffset' in before).toBe(false);
    sim.step(1);
    expect(sim.getState().time).toBe(before.time);
    sim.setParams({ magneticField: 9 });
    expect(sim.getParams().magneticField).toBe(3);
    const scene = createAmpereBalanceScene();
    scene.reset();
    expect(scene.getParams()).toMatchObject({
      inclineAngle: 30,
      magneticField: 1,
      current: 4.6,
      mass: 0.8,
      fieldDirection: 'down',
      currentDirection: 'out'
    });
    scene.dispose();
  });

  describe('URL batch payload', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      window.history.replaceState(
        {},
        '',
        '/src/pages/ampere-balance.html?audit=keep'
      );
    });
    afterEach(() => {
      vi.useRealTimers();
      window.history.replaceState({}, '', '/');
    });

    it('encodes field/current as numbers so readSceneParams parseInt round-trips', () => {
      expect(encodeFieldDirection('up')).toBe(0);
      expect(encodeFieldDirection('down')).toBe(1);
      expect(encodeCurrentDirection('out')).toBe(0);
      expect(encodeCurrentDirection('in')).toBe(1);
      expect(parseFieldDirection(parseInt('0', 10))).toBe('up');
      expect(parseCurrentDirection(parseInt('1', 10))).toBe('in');
    });

    it('writes all six legal keys in one writeSceneParams call', () => {
      const payload = ampereBalanceUrlPayload({
        ...defaults,
        ...ampereBalancePresets.balance
      });
      expect(Object.keys(payload)).toEqual([...ampereBalanceUrlKeys]);
      writeSceneParams(payload);
      vi.advanceTimersByTime(150);
      const url = new URL(window.location.href);
      expect(url.searchParams.get('fieldDirection')).toBe('0');
      expect(url.searchParams.get('currentDirection')).toBe('0');
      expect(Number(url.searchParams.get('fieldDirection'))).toBe(0);
      expect(url.searchParams.get('inclineAngle')).toBe('30');
      expect(url.searchParams.get('magneticField')).toBe('1');
      expect(url.searchParams.get('current')).toBe('4.62');
      expect(url.searchParams.get('mass')).toBe('0.8');
      expect(url.searchParams.get('audit')).toBe('keep');
    });

    it('drops earlier keys if writeSceneParams is called six times', () => {
      const payload = ampereBalanceUrlPayload({
        ...defaults,
        ...ampereBalancePresets.balance
      });
      for (const [key, value] of Object.entries(payload)) {
        writeSceneParams({ [key]: value });
      }
      vi.advanceTimersByTime(150);
      const url = new URL(window.location.href);
      expect(url.searchParams.get('currentDirection')).toBe('0');
      expect(url.searchParams.get('fieldDirection')).toBeNull();
      expect(url.searchParams.get('inclineAngle')).toBeNull();
    });

    it('clears the six keys on reset while keeping unrelated query keys', () => {
      window.history.replaceState(
        {},
        '',
        '/src/pages/ampere-balance.html?fieldDirection=up&current=4.6&audit=keep'
      );
      writeSceneParams(ampereBalanceUrlReset());
      vi.advanceTimersByTime(150);
      const url = new URL(window.location.href);
      expect(url.searchParams.get('fieldDirection')).toBeNull();
      expect(url.searchParams.get('current')).toBeNull();
      expect(url.searchParams.get('audit')).toBe('keep');
    });

    it('restores fieldDirection and currentDirection via setControlActive after numeric URL apply', () => {
      const scene = createAmpereBalanceScene();
      const setValue = vi.fn();
      const setActive = vi.fn();
      window.history.replaceState(
        {},
        '',
        '/src/pages/ampere-balance.html?fieldDirection=3&currentDirection=1'
      );
      applySceneUrlParams(
        ampereBalanceMeta,
        {
          scene,
          controls: { setValue, setActive },
          mount: document.createElement('div'),
          scheduleRender: () => scene.render()
        },
        {
          applyParam: (key, value, ctx) =>
            applyAmpereBalanceUrlParam(key, value, {
              scene: ctx.scene,
              setControlActive: ctx.setControlActive,
              setControlValue: ctx.setControlValue
            })
        }
      );
      expect(scene.getParams().fieldDirection).toBe('left');
      expect(scene.getParams().currentDirection).toBe('in');
      expect(setActive).toHaveBeenCalledWith('fieldDirection', 'left');
      expect(setActive).toHaveBeenCalledWith('currentDirection', 'in');
      expect(setValue).not.toHaveBeenCalledWith(
        'fieldDirection',
        expect.anything()
      );
      expect(setValue).not.toHaveBeenCalledWith(
        'currentDirection',
        expect.anything()
      );
      const pageSrc = readFileSync(
        resolve(process.cwd(), 'src/scenes/ampere-balance/page.ts'),
        'utf8'
      );
      expect(pageSrc).toContain('applyAmpereBalanceUrlParam');
      expect(pageSrc).not.toMatch(
        /key === 'fieldDirection'[\s\S]{0,200}setControlValue/
      );
      scene.dispose();
    });
  });
});
