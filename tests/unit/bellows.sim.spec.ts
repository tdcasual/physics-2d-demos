import { describe, expect, it } from 'vitest';
import { createBellowsScene } from '../../src/scenes/bellows/scene.entry';
import {
  bellowsConstants,
  createBellowsSim
} from '../../src/scenes/bellows/scene.sim';

const LEFT_LINKAGE = {
  direction: 'left' as const,
  leftPressure: 'high' as const,
  rightPressure: 'low' as const,
  valves: { A: false, B: true, C: true, D: false }
};

const RIGHT_LINKAGE = {
  direction: 'right' as const,
  leftPressure: 'low' as const,
  rightPressure: 'high' as const,
  valves: { A: true, B: false, C: false, D: true }
};

function expectInsideChamber(pistonX: number): void {
  expect(pistonX).toBeGreaterThanOrEqual(
    bellowsConstants.chamberLeft + bellowsConstants.pistonHalf
  );
  expect(pistonX).toBeLessThanOrEqual(
    bellowsConstants.chamberRight - bellowsConstants.pistonHalf
  );
  expect(pistonX).toBeGreaterThanOrEqual(bellowsConstants.pistonMin);
  expect(pistonX).toBeLessThanOrEqual(bellowsConstants.pistonMax);
}

function expectLinkage(
  state: ReturnType<ReturnType<typeof createBellowsSim>['getState']>,
  expected: typeof LEFT_LINKAGE | typeof RIGHT_LINKAGE
): void {
  expect(state.direction).toBe(expected.direction);
  expect(state.leftPressure).toBe(expected.leftPressure);
  expect(state.rightPressure).toBe(expected.rightPressure);
  expect(state.valves).toEqual(expected.valves);
  expectInsideChamber(state.pistonX);
}

describe('bellows sim', () => {
  it('opens C/B when pushing left, independent of piston side of center', () => {
    const sim = createBellowsSim({ motion: 'left' });
    const state = sim.getState();
    expectLinkage(state, LEFT_LINKAGE);
    // Held left-stroke pose is still right of center: volume is not the cue.
    expect(state.progress).toBeGreaterThan(0);
    expect(state.pistonX).toBeGreaterThan(bellowsConstants.pistonCenter);
  });

  it('opens D/A when pulling right, independent of piston side of center', () => {
    const sim = createBellowsSim({ motion: 'right' });
    const state = sim.getState();
    expectLinkage(state, RIGHT_LINKAGE);
    expect(state.progress).toBeLessThan(0);
    expect(state.pistonX).toBeLessThan(bellowsConstants.pistonCenter);
  });

  it('keeps direction, pressure and valves consistent across auto phases', () => {
    const sim = createBellowsSim();
    // t=0 is the start of the left stroke: piston is on the right,
    // but the left chamber is already the compressing (high) side.
    const origin = sim.getState();
    expect(origin.t).toBe(0);
    expect(origin.progress).toBeCloseTo(1, 8);
    expectLinkage(origin, LEFT_LINKAGE);

    const samples = 40;
    const dt = bellowsConstants.cycle / samples;
    let sawLeft = false;
    let sawRight = false;
    for (let i = 0; i <= samples; i += 1) {
      const state = sim.getState();
      if (state.direction === 'left') {
        sawLeft = true;
        expectLinkage(state, LEFT_LINKAGE);
      } else {
        sawRight = true;
        expectLinkage(state, RIGHT_LINKAGE);
      }
      sim.step(dt);
    }
    expect(sawLeft).toBe(true);
    expect(sawRight).toBe(true);
  });

  it('switches linkage at mid-cycle even if the piston is still on the left', () => {
    const sim = createBellowsSim();
    sim.step(bellowsConstants.cycle / 2);
    const turn = sim.getState();
    expect(turn.t).toBeCloseTo(2, 8);
    expect(turn.progress).toBeCloseTo(-1, 8);
    expectLinkage(turn, RIGHT_LINKAGE);
  });

  it('animates only in automatic mode and can pause then resume', () => {
    const sim = createBellowsSim();
    sim.step(1);
    expect(sim.getState().t).toBeCloseTo(1, 8);
    expectLinkage(sim.getState(), LEFT_LINKAGE);
    sim.setParams({ autoRun: false });
    sim.step(1);
    expect(sim.getState().t).toBeCloseTo(1, 8);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().t).toBeCloseTo(1.5, 8);
  });

  it('does not advance time when motion is fixed', () => {
    const sim = createBellowsSim({ motion: 'left' });
    sim.step(1.25);
    expect(sim.getState().t).toBe(0);
    expectLinkage(sim.getState(), LEFT_LINKAGE);
    sim.setMotion('right');
    sim.step(1.25);
    expect(sim.getState().t).toBe(0);
    expectLinkage(sim.getState(), RIGHT_LINKAGE);
  });

  it('resets time and parameters to the construction defaults', () => {
    const sim = createBellowsSim({ motion: 'auto', showFlow: true });
    sim.setMotion('right');
    sim.setParams({ showFlow: false, autoRun: false });
    sim.step(0);
    sim.reset();
    const params = sim.getParams();
    expect(params).toEqual({ motion: 'auto', autoRun: true, showFlow: true });
    expect(sim.getState().t).toBe(0);
    expectLinkage(sim.getState(), LEFT_LINKAGE);
  });

  it('normalizes motion, flags, and non-finite dt', () => {
    const sim = createBellowsSim({
      motion: 'up' as unknown as 'auto',
      autoRun: 0 as unknown as boolean,
      showFlow: 'false' as unknown as boolean
    });
    expect(sim.getParams()).toEqual({
      motion: 'auto',
      autoRun: false,
      showFlow: false
    });
    sim.setParams({
      motion: 'left',
      autoRun: '1' as unknown as boolean,
      showFlow: 0 as unknown as boolean
    });
    expect(sim.getParams()).toEqual({
      motion: 'left',
      autoRun: true,
      showFlow: false
    });
    sim.setParams({ autoRun: true, motion: 'auto' });
    const before = sim.getState().t;
    sim.step(Number.NaN);
    sim.step(-2);
    expect(sim.getState().t).toBe(before);
  });

  it('wraps the cycle and keeps snapshots aligned with getState', () => {
    const sim = createBellowsSim();
    sim.step(bellowsConstants.cycle + 0.25);
    expect(sim.getState().t).toBeCloseTo(0.25, 8);
    expect(sim.getSnapshot()).toEqual(sim.getState());
  });
});

describe('bellows entry readout', () => {
  it('reports action, both chambers, and the four valves', () => {
    const canvas = document.createElement('canvas');
    const scene = createBellowsScene({ canvas });
    scene.setMotion('left');
    const items = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(items.direction).toBe('向左推动');
    expect(items.leftPressure).toBe('压缩升压');
    expect(items.rightPressure).toBe('扩张降压');
    expect(items.valveC).toBe('开·排气');
    expect(items.valveB).toBe('开·进气');
    expect(items.valveA).toBe('闭合');
    expect(items.valveD).toBe('闭合');
    scene.setMotion('right');
    const pulled = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(pulled.direction).toBe('向右拉回');
    expect(pulled.valveD).toBe('开·排气');
    expect(pulled.valveA).toBe('开·进气');
    scene.dispose();
  });
});
