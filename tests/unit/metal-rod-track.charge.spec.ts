/**
 * metal-rod-track · 微元法求电荷量模式
 *
 * 手算基准：B = 0.5 T，L = 0.4 m，R = 2 Ω ⇒ BL/R = 0.1 C/m，
 * 滑过 x = 1.0 m 时 q = BLx/R = 0.1 C，与 v 怎样变化无关；
 * ΣIΔt 随 n 增大（Δt → 0）收敛到 0.1 C。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applySceneUrlParams } from '../../src/app/url-sync';
import type { SceneParamSync } from '../../src/app/scene-bootstrapper-types';
import {
  CHARGE_PROFILES,
  bellPeakVelocity,
  chargeByFormula,
  chargeDisplacementAt,
  chargeProfileDuration,
  chargeStripSum,
  chargeStrips,
  chargeVelocityAt,
  decodeChargeProfile,
  encodeChargeProfile,
  inducedCurrent
} from '../../src/scenes/metal-rod-track/charge-model';
import {
  createMetalRodSim,
  metalRodConstants
} from '../../src/scenes/metal-rod-track/scene.sim';
import { createMetalRodScene } from '../../src/scenes/metal-rod-track/scene.entry';
import { metalRodMeta } from '../../src/scenes/metal-rod-track/scene.meta';
import {
  avoidOcclusions,
  drawChargeMode,
  formatTick,
  layoutCharge
} from '../../src/scenes/metal-rod-track/renderer/draw-charge';
import { chargeTypeScale } from '../../src/scenes/metal-rod-track/renderer/charge-palette';

const B = 0.5;
const L = 0.4;
const R = 2;

describe('charge-model · 手算 q = BLx/R', () => {
  it('I = BLv/R: v = 1 m/s ⇒ I = 0.1 A; q(x = 1 m) = 0.1 C', () => {
    expect(inducedCurrent(B, L, R, 1)).toBeCloseTo(0.1, 12);
    expect(chargeByFormula(B, L, R, 1)).toBeCloseTo(0.1, 12);
    expect(chargeByFormula(B, L, R, 0.5)).toBeCloseTo(0.05, 12);
  });

  it('every profile ends at x = 1.0 m (damping: 1 − e⁻⁷) ⇒ q = 0.1 C', () => {
    for (const profile of ['uniform', 'decel', 'bell'] as const) {
      const x = chargeDisplacementAt(profile, chargeProfileDuration(profile));
      expect(x).toBeCloseTo(1, 12);
      expect(chargeByFormula(B, L, R, x)).toBeCloseTo(0.1, 12);
    }
    const xd = chargeDisplacementAt('damping', 7);
    expect(xd).toBeCloseTo(1 - Math.exp(-7), 12);
    expect(chargeByFormula(B, L, R, xd)).toBeCloseTo(0.1, 3);
  });

  it('durations: 匀速 1 s, 匀减速 2 s (x = v₀T/2), 阻尼 7 s, 先加速后减速 2 s', () => {
    expect(chargeProfileDuration('uniform')).toBe(1);
    expect(chargeProfileDuration('decel')).toBe(2);
    expect(chargeProfileDuration('damping')).toBe(7);
    expect(chargeProfileDuration('bell')).toBe(2);
    expect(bellPeakVelocity()).toBeCloseTo(Math.PI / 4, 12);
  });

  it('电磁阻尼: v 随 x 线性减小 v = v₀ − kx（t = ln2 时 x = 0.5 m, v = 0.5 m/s）', () => {
    const t = Math.LN2;
    expect(chargeDisplacementAt('damping', t)).toBeCloseTo(0.5, 12);
    expect(chargeVelocityAt('damping', t)).toBeCloseTo(0.5, 12);
    for (const time of [0.3, 1.1, 2.5, 5]) {
      const x = chargeDisplacementAt('damping', time);
      expect(chargeVelocityAt('damping', time)).toBeCloseTo(1 - x, 12);
    }
  });

  it('匀减速: v = v₀(1 − t/T)，t = 1 s 时 v = 0.5 m/s, x = 0.75 m', () => {
    expect(chargeVelocityAt('decel', 1)).toBeCloseTo(0.5, 12);
    expect(chargeDisplacementAt('decel', 1)).toBeCloseTo(0.75, 12);
    expect(chargeVelocityAt('decel', 2)).toBeCloseTo(0, 12);
  });

  it('匀速与匀减速：中点矩形和对任意 n 都恰为 0.1 C', () => {
    for (const n of [4, 7, 20, 60]) {
      expect(chargeStripSum('uniform', B, L, R, n)).toBeCloseTo(0.1, 12);
      expect(chargeStripSum('decel', B, L, R, n)).toBeCloseTo(0.1, 12);
    }
  });

  it('先加速后减速 n = 2: 0.1·π√2/4 ≈ 0.11107 C；n = 4 ≈ 0.10262 C', () => {
    expect(chargeStripSum('bell', B, L, R, 2)).toBeCloseTo(
      (0.1 * Math.PI * Math.SQRT2) / 4,
      12
    );
    const n4 =
      0.1 *
      (Math.PI / 4) *
      0.5 *
      2 *
      (Math.sin(Math.PI / 8) + Math.sin((3 * Math.PI) / 8));
    expect(chargeStripSum('bell', B, L, R, 4)).toBeCloseTo(n4, 12);
    expect(n4).toBeCloseTo(0.102617, 5);
  });

  it('ΣIΔt converges to BLx/R as Δt → 0 (error shrinks monotonically)', () => {
    for (const profile of ['bell', 'damping'] as const) {
      const target = chargeByFormula(
        B,
        L,
        R,
        chargeDisplacementAt(profile, chargeProfileDuration(profile))
      );
      const errors = [4, 8, 16, 32, 60].map((n) =>
        Math.abs(chargeStripSum(profile, B, L, R, n) - target)
      );
      for (let i = 1; i < errors.length; i += 1) {
        expect(errors[i]).toBeLessThan(errors[i - 1]);
      }
      expect(errors[errors.length - 1]).toBeLessThan(1e-4);
    }
  });

  it('same x, different v(t): all four ΣIΔt agree with 0.1 C at n = 60', () => {
    const sums = CHARGE_PROFILES.map((p) => chargeStripSum(p, B, L, R, 60));
    for (const sum of sums) expect(sum).toBeCloseTo(0.1, 3);
  });

  it('partial sums: 匀减速 n = 4, t = 0.5 s ⇒ 0.1·0.875·0.5 = 0.04375 C = BLx(t)/R', () => {
    expect(chargeStripSum('decel', B, L, R, 4, 0.5)).toBeCloseTo(0.04375, 12);
    expect(
      chargeByFormula(B, L, R, chargeDisplacementAt('decel', 0.5))
    ).toBeCloseTo(0.04375, 12);
    expect(chargeStripSum('decel', B, L, R, 4, 0)).toBe(0);
  });

  it('strips split [0, T] evenly and use midpoint current', () => {
    const strips = chargeStrips('decel', B, L, R, 4);
    expect(strips.map((s) => [s.t0, s.t1])).toEqual([
      [0, 0.5],
      [0.5, 1],
      [1, 1.5],
      [1.5, 2]
    ]);
    expect(strips[0].current).toBeCloseTo(0.1 * 0.875, 12);
    expect(strips[3].current).toBeCloseTo(0.1 * 0.125, 12);
  });

  it('profile URL encoding round-trips (0..3) and falls back to 匀速', () => {
    CHARGE_PROFILES.forEach((p, i) => {
      expect(encodeChargeProfile(p)).toBe(i);
      expect(decodeChargeProfile(i)).toBe(p);
      expect(decodeChargeProfile(String(i))).toBe(p);
    });
    expect(decodeChargeProfile('bell')).toBe('bell');
    expect(decodeChargeProfile(9)).toBe('uniform');
    expect(decodeChargeProfile('nope')).toBe('uniform');
  });
});

describe('metal-rod-track sim · charge mode', () => {
  // 场景内 L = 1.5 m；取 B = 0.4 T，R = 3 Ω ⇒ BL/R = 0.2 C/m
  const setup = (profile: number, strips = 20) => {
    const sim = createMetalRodSim();
    sim.setParams({
      mode: 'charge',
      magneticField: 0.4,
      resistance: 3,
      profile,
      strips
    });
    return sim;
  };
  const run = (sim: ReturnType<typeof createMetalRodSim>, seconds: number) => {
    for (let t = 0; t < seconds; t += 0.05) sim.step(0.05);
  };

  it('uses the scene rod length L = 1.5 m', () => {
    expect(metalRodConstants.rodLength).toBe(1.5);
  });

  it('starts at x = 0 with ΣIΔt = 0 and I = BLv₀/R = 0.2 A (匀速)', () => {
    const c = setup(0).getState().charge;
    expect(c.time).toBe(0);
    expect(c.displacement).toBe(0);
    expect(c.stripSum).toBe(0);
    expect(c.current).toBeCloseTo(0.2, 12);
  });

  it('every profile ends with ΣIΔt ≈ BLx/R = 0.2 C', () => {
    for (let profile = 0; profile < 4; profile += 1) {
      const sim = setup(profile, 60);
      run(sim, 8);
      const s = sim.getState();
      expect(s.charge.finished).toBe(true);
      expect(s.charge.formula).toBeCloseTo(0.2, 3);
      expect(s.charge.stripSum).toBeCloseTo(0.2, 3);
      expect(s.status).toContain('累计完毕');
    }
  });

  it('state mirrors the charge kinematics (E = BLv, I = E/R, Fₐ = BIL)', () => {
    const sim = setup(1);
    run(sim, 1);
    const s = sim.getState();
    expect(s.position).toBeCloseTo(s.charge.displacement, 12);
    expect(s.velocity).toBeCloseTo(s.charge.velocity, 12);
    expect(s.emf).toBeCloseTo(0.4 * 1.5 * s.velocity, 12);
    expect(s.current).toBeCloseTo(s.emf / 3, 12);
    expect(s.magneticForce).toBeCloseTo(0.4 * s.current * 1.5, 12);
  });

  it('clamps time at the profile duration and pauses when autoRun is off', () => {
    const sim = setup(0);
    run(sim, 3);
    expect(sim.getState().charge.time).toBe(1);
    const paused = setup(0);
    paused.setParams({ autoRun: false });
    run(paused, 1);
    expect(paused.getState().charge.time).toBe(0);
  });

  it('changing profile restarts at x = 0; changing n keeps the time', () => {
    const sim = setup(1);
    run(sim, 0.5);
    const t = sim.getState().charge.time;
    expect(t).toBeGreaterThan(0);
    sim.setParams({ strips: 40 });
    expect(sim.getState().charge.time).toBe(t);
    sim.setParams({ profile: 2 });
    expect(sim.getState().charge.time).toBe(0);
  });

  it('clamps profile to 0..3 and n to 4..60 (integers)', () => {
    const sim = createMetalRodSim();
    expect(sim.setParams({ profile: 9, strips: 500 })).toMatchObject({
      profile: 3,
      strips: 60
    });
    expect(sim.setParams({ profile: -2, strips: 1.4 })).toMatchObject({
      profile: 0,
      strips: 4
    });
    expect(sim.setParams({ strips: 12.6 }).strips).toBe(13);
  });

  it('reset keeps mode + profile, restores B, R, n and restarts', () => {
    const sim = setup(3, 40);
    run(sim, 1);
    sim.reset();
    const p = sim.getParams();
    expect(p).toMatchObject({
      mode: 'charge',
      profile: 3,
      magneticField: 1,
      resistance: 2,
      strips: 20
    });
    expect(sim.getState().charge.time).toBe(0);
  });
});

describe('metal-rod-track entry · charge readouts', () => {
  it('lists ΣIΔt, BLx/R and x first with units (默认 B = 1 T, R = 2 Ω)', () => {
    const scene = createMetalRodScene();
    scene.setParams({ mode: 'charge', profile: 1 });
    for (let i = 0; i < 60; i += 1) scene.step(0.05);
    const items = scene.getReadoutItems();
    expect(items.slice(0, 3).map((r) => r.key)).toEqual([
      'charge-sum',
      'charge-formula',
      'charge-x'
    ]);
    // 匀减速：中点矩形和恰等于 BLx/R = 1·1.5·1/2 = 0.75 C
    expect(items[0].value).toBe('0.750 C');
    expect(items[1].value).toBe('0.750 C');
    expect(items[2].value).toBe('1.000 m');
    scene.dispose();
  });

  it('meta: numeric URL params and ≤3 charge readouts in presentation', () => {
    expect(metalRodMeta.defaultParams).toMatchObject({
      profile: 0,
      strips: 20
    });
    expect(metalRodMeta.urlSyncKeys).toEqual(
      expect.arrayContaining(['mode', 'profile', 'strips'])
    );
    const keys = metalRodMeta.demoProfile?.readoutKeys ?? [];
    expect(keys.filter((k) => k.startsWith('charge-'))).toHaveLength(3);
  });
});

type Handle = {
  syncFromScene?: () => void;
  dispose: () => void;
};

const captured = vi.hoisted(() => ({
  createControls: null as unknown,
  paramSync: null as unknown
}));

vi.mock('../../src/app/scene-bootstrapper', () => ({
  bootScenePage: (opts: { createControls: unknown; paramSync?: unknown }) => {
    captured.createControls = opts.createControls;
    captured.paramSync = opts.paramSync;
  }
}));

import '../../src/scenes/metal-rod-track/page';

describe('metal-rod-track page · charge controls', () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => {
    while (cleanups.length > 0) cleanups.pop()?.();
  });

  const mount = () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const scene = createMetalRodScene();
    const writeParam = vi.fn();
    const handle = (
      captured.createControls as (o: {
        mount: HTMLElement;
        scene: unknown;
        writeParam?: (k: string, v: unknown) => void;
        scheduleRender?: () => void;
      }) => Handle
    )({ mount: el, scene, writeParam, scheduleRender: vi.fn() });
    cleanups.push(() => {
      handle.dispose();
      scene.dispose();
      el.remove();
    });
    return { el, scene, handle, writeParam };
  };
  const hidden = (el: HTMLElement, selector: string): boolean =>
    (el.querySelector(selector) as HTMLElement | null)?.hidden ?? true;

  it('hides the charge card in coast mode and m / v₀ in charge mode', () => {
    const { el, scene, handle } = mount();
    expect(hidden(el, '[data-control-section="微元法求电荷量"]')).toBe(true);
    expect(hidden(el, '[data-control-key="mass"]')).toBe(false);
    const charge = Array.from(
      el.querySelectorAll<HTMLButtonElement>('[data-control-key="mode"] button')
    ).find((b) => b.textContent?.includes('微元法求电荷量'));
    expect(charge).toBeTruthy();
    charge?.click();
    expect(scene.getParams().mode).toBe('charge');
    expect(hidden(el, '[data-control-section="微元法求电荷量"]')).toBe(false);
    expect(hidden(el, '[data-control-key="mass"]')).toBe(true);
    expect(hidden(el, '[data-control-key="initialVelocity"]')).toBe(true);
    scene.reset();
    handle.syncFromScene?.();
    expect(hidden(el, '[data-control-key="mass"]')).toBe(true);
  });

  it('profile select writes a numeric URL param', () => {
    const { el, scene, writeParam } = mount();
    const select = el.querySelector<HTMLSelectElement>(
      '[data-control-key="profile"] select'
    );
    expect(select?.options).toHaveLength(4);
    if (!select) return;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    expect(scene.getParams().profile).toBe(2);
    expect(writeParam).toHaveBeenCalledWith('profile', 2);
  });

  it('?mode=charge&profile=3&strips=8 applies and projects to controls', () => {
    const { el, scene, handle } = mount();
    applySceneUrlParams(
      metalRodMeta,
      { scene, controls: handle, mount: el, scheduleRender: vi.fn() },
      captured.paramSync as SceneParamSync,
      { mode: 'charge', profile: 3, strips: 8 }
    );
    expect(scene.getParams()).toMatchObject({
      mode: 'charge',
      profile: 3,
      strips: 8
    });
    expect(
      el.querySelector<HTMLSelectElement>('[data-control-key="profile"] select')
        ?.value
    ).toBe('3');
    expect(hidden(el, '[data-control-section="微元法求电荷量"]')).toBe(false);
  });
});

describe('charge renderer · layout & drawing', () => {
  const type = chargeTypeScale(1, 1);

  it('formatTick keeps 2.5×10ᵏ steps exact (0.25, not 0.3)', () => {
    expect(formatTick(0.25, 0.25)).toBe('0.25');
    expect(formatTick(0.5, 0.25)).toBe('0.50');
    expect(formatTick(1.5, 0.5)).toBe('1.5');
    expect(formatTick(4, 2)).toBe('4');
  });

  it('avoidOcclusions trims the region away from the readout panel', () => {
    const region = avoidOcclusions(
      { left: 10, top: 10, right: 790, bottom: 590 },
      [{ left: 600, top: 10, right: 790, bottom: 250 }],
      8,
      { width: 200, height: 200 }
    );
    expect(region.right).toBeLessThanOrEqual(592);
    expect(region.bottom).toBe(590);
  });

  it('wide canvas → side-by-side; tall canvas → stacked', () => {
    const wide = layoutCharge(1600, 700, type, []);
    expect(wide.orientation).toBe('row');
    expect(wide.apparatus.right).toBeLessThan(wide.graph.left);
    const tall = layoutCharge(700, 700, type, []);
    expect(tall.orientation).toBe('column');
    expect(tall.apparatus.bottom).toBeLessThan(tall.graph.top);
  });

  it('stage holds only the drawing: single-symbol labels, axis names and ticks', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    const texts: string[] = [];
    const spy = vi
      .spyOn(ctx, 'fillText')
      .mockImplementation((text: string) => void texts.push(String(text)));
    const allowed = new Set([
      'R',
      'L',
      'B ⊗',
      'v',
      'I',
      'Fₐ',
      'x = 0',
      'x = 1.0 m',
      'I / A',
      't / s'
    ]);
    for (const profile of [1, 3]) {
      const sim = createMetalRodSim();
      sim.setParams({ mode: 'charge', profile });
      for (const seconds of [0.6, 8]) {
        for (let t = 0; t < seconds; t += 0.05) sim.step(0.05);
        drawChargeMode({
          ctx,
          width: 900,
          height: 600,
          theme: 'light',
          responsiveScale: 1,
          contentScale: 1,
          occlusions: [],
          state: sim.getState()
        });
      }
    }
    spy.mockRestore();
    expect(texts.length).toBeGreaterThan(0);
    const extra = texts.filter(
      (t) => !allowed.has(t) && !/^\d+(\.\d+)?$/.test(t)
    );
    expect(extra).toEqual([]);
  });

  it('content is centred in the free region (no header band)', () => {
    const tall = layoutCharge(700, 700, type, []);
    expect(tall.apparatus.top).toBe(tall.region.top);
    expect(tall.graph.bottom).toBe(tall.region.bottom);
    const wide = layoutCharge(2400, 700, type, []);
    const midY = (wide.apparatus.top + wide.apparatus.bottom) / 2;
    expect(midY).toBeCloseTo((wide.region.top + wide.region.bottom) / 2, 6);
  });

  it('draws mid-animation and finished frames without throwing', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    for (const profile of [0, 1, 2, 3]) {
      const sim = createMetalRodSim();
      sim.setParams({ mode: 'charge', profile });
      for (const seconds of [0, 0.6, 8]) {
        for (let t = 0; t < seconds; t += 0.05) sim.step(0.05);
        for (const theme of ['light', 'dark'] as const) {
          expect(() =>
            drawChargeMode({
              ctx,
              width: 900,
              height: 600,
              theme,
              responsiveScale: 1,
              contentScale: 1,
              occlusions: [],
              state: sim.getState()
            })
          ).not.toThrow();
        }
      }
    }
  });
});
