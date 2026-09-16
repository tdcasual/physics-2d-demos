import { describe, expect, it } from 'vitest';
import { createBlockBoardScene } from '../../src/scenes/block-board/scene.entry';
import {
  apparatusInsideFrame,
  apparatusLayout,
  blockBoardConstants as C,
  blockAcceleration,
  boardAcceleration,
  commonVelocityFor,
  createBlockBoardSim,
  graphFrame,
  graphSeries,
  loopHorizonFor,
  relativeSlideFor,
  stageTransform,
  stateAt,
  syncTimeFor,
  wrapBlockBoardTime
} from '../../src/scenes/block-board/scene.sim';

describe('block-board simulation', () => {
  it('matches friction accelerations and the common-speed time', () => {
    // m=2, M=2, v0=6, μ=0.2, g=10
    // f = μmg = 4 N → a1 = -2, a2 = 2
    // tc = v0 / (μg(1+m/M)) = 6 / 4 = 1.5 s
    const sim = createBlockBoardSim();
    const state = sim.getState();
    expect(state.blockAcceleration).toBeCloseTo(-2, 6);
    expect(state.boardAcceleration).toBeCloseTo(2, 6);
    expect(syncTimeFor(sim.getParams())).toBeCloseTo(1.5, 6);
    expect(blockAcceleration(sim.getParams())).toBeCloseTo(-2, 6);
    expect(boardAcceleration(sim.getParams())).toBeCloseTo(2, 6);
  });

  it('conserves momentum after sliding stops', () => {
    // vc = m v0 / (M+m) = 2*6/4 = 3
    // Δx = ½ v0 tc = 0.5*6*1.5 = 4.5
    const sim = createBlockBoardSim({ autoRun: false });
    const state = stateAt(sim.getParams(), 2);
    expect(state.sliding).toBe(false);
    expect(state.blockVelocity).toBeCloseTo(3, 6);
    expect(state.boardVelocity).toBeCloseTo(3, 6);
    expect(state.commonVelocity).toBeCloseTo(3, 6);
    expect(state.relativeDisplacement).toBeCloseTo(4.5, 6);
  });

  it('uses vc = m v0 / (M+m) when masses are unequal', () => {
    // m=1, M=3, v0=8, μ=0.2, g=10
    // f = 2 N, a1 = -2, a2 = 2/3
    // tc = 8 / (8/3) = 3 s
    // vc = 8/4 = 2
    // Δx = ½ * 8 * 3 = 12
    const params = {
      blockMass: 1,
      boardMass: 3,
      initialVelocity: 8,
      friction: 0.2,
      autoRun: false
    };
    expect(syncTimeFor(params)).toBeCloseTo(3, 6);
    expect(commonVelocityFor(params)).toBeCloseTo(2, 6);
    expect(relativeSlideFor(params)).toBeCloseTo(12, 6);
    const mid = stateAt(params, 1.5);
    expect(mid.sliding).toBe(true);
    expect(mid.blockVelocity).toBeCloseTo(8 - 2 * 1.5, 6);
    expect(mid.boardVelocity).toBeCloseTo((2 / 3) * 1.5, 6);
    const done = stateAt(params, 3);
    expect(done.sliding).toBe(false);
    expect(done.blockVelocity).toBeCloseTo(2, 6);
    expect(done.boardVelocity).toBeCloseTo(2, 6);
    expect(done.relativeDisplacement).toBeCloseTo(12, 6);
    const later = stateAt(params, 10);
    expect(later.sliding).toBe(false);
    expect(later.blockVelocity).toBeCloseTo(2, 6);
    expect(later.relativeDisplacement).toBeCloseTo(12, 6);
    expect(later.blockPosition - later.boardPosition).toBeCloseTo(12, 6);
  });

  it('returns the full tc even when it exceeds the graph viewport', () => {
    // m=0.5, M=10, v0=12, μ=0.05, g=10
    // a_rel = 0.05*10*(1+0.5/10) = 0.525
    // tc = 12 / 0.525 = 160/7 ≈ 22.857 s
    const params = {
      blockMass: 0.5,
      boardMass: 10,
      initialVelocity: 12,
      friction: 0.05
    };
    const tc = syncTimeFor(params);
    expect(tc).toBeCloseTo(160 / 7, 6);
    expect(tc).toBeGreaterThan(C.graphViewTime);
    const clipped = stateAt(params, C.graphViewTime);
    expect(clipped.sliding).toBe(true);
    expect(clipped.blockVelocity).toBeCloseTo(12 - 0.5 * C.graphViewTime, 6);
    expect(clipped.syncTime).toBeCloseTo(tc, 6);
    const after = stateAt(params, tc);
    expect(after.sliding).toBe(false);
    expect(after.commonVelocity).toBeCloseTo((0.5 * 12) / 10.5, 6);
    expect(after.relativeDisplacement).toBeCloseTo(0.5 * 12 * tc, 6);
  });

  it('hides an off-canvas common-speed marker without changing physics', () => {
    const extreme = createBlockBoardSim({
      blockMass: 0.5,
      boardMass: 10,
      initialVelocity: 12,
      friction: 0.05,
      autoRun: false
    });
    const layout = apparatusLayout(extreme.getState());
    expect(layout.syncVisible).toBe(false);
    expect(apparatusInsideFrame(layout)).toBe(true);

    const normal = apparatusLayout(
      createBlockBoardSim({ autoRun: false }).getState()
    );
    expect(normal.syncVisible).toBe(true);
  });

  it('keeps the visual apparatus in frame during a long valid run', () => {
    const params = {
      blockMass: 0.5,
      boardMass: 10,
      initialVelocity: 12,
      friction: 0.05,
      autoRun: false
    };
    const state = stateAt(params, 12);
    const layout = apparatusLayout(state);
    expect(apparatusInsideFrame(layout)).toBe(true);
    expect(layout.board.x).toBeGreaterThanOrEqual(2);
    expect(layout.block.x + layout.block.w).toBeLessThanOrEqual(
      C.baseWidth - 2
    );
    expect(layout.block.x).toBeLessThan(layout.board.x + layout.board.w);
    // The state remains physically unbounded; only the canvas projection is bounded.
    expect(state.blockPosition).toBeGreaterThan(20);
    expect(state.relativeDisplacement).toBeGreaterThan(50);
  });

  it('clips graph series in the viewport without changing tc', () => {
    const long = {
      blockMass: 0.5,
      boardMass: 10,
      initialVelocity: 12,
      friction: 0.05
    };
    const tc = syncTimeFor(long);
    const series = graphSeries(long);
    const block = series.find((item) => item.id === 'block');
    expect(block).toBeDefined();
    const times = block!.points.map((p) => p.t);
    expect(Math.max(...times)).toBeLessThanOrEqual(C.graphViewTime + 1e-9);
    expect(tc).toBeGreaterThan(C.graphViewTime);
    expect(stateAt(long, tc).sliding).toBe(false);

    const def = graphSeries(createBlockBoardSim().getParams());
    const defBlock = def.find((item) => item.id === 'block')!.points;
    expect(defBlock[0]?.t).toBe(0);
    expect(defBlock[0]?.v).toBe(6);
    const knee = defBlock.find((p) => Math.abs(p.t - 1.5) < 1e-6);
    expect(knee?.v).toBeCloseTo(3, 6);
  });

  it('treats v0 = 0 as already at common speed', () => {
    const params = { initialVelocity: 0, autoRun: false };
    expect(syncTimeFor(params)).toBe(0);
    expect(commonVelocityFor(params)).toBe(0);
    expect(relativeSlideFor(params)).toBe(0);
    const state = stateAt(params, 1);
    expect(state.sliding).toBe(false);
    expect(state.blockVelocity).toBe(0);
    expect(state.boardVelocity).toBe(0);
    expect(state.blockPosition).toBe(0);
    expect(state.relativeDisplacement).toBe(0);
  });

  it('pauses, steps a fixed frame, then resumes', () => {
    const sim = createBlockBoardSim({ autoRun: false });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.stepFrame(C.frameDt);
    expect(sim.getState().time).toBeCloseTo(C.frameDt, 8);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(C.frameDt + 0.5, 8);
    sim.setParams({ autoRun: false });
    const frozen = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(frozen);
  });

  it('clamps unsafe parameters and ignores non-finite steps', () => {
    const sim = createBlockBoardSim({
      blockMass: 0,
      boardMass: 99,
      friction: 99,
      initialVelocity: 99,
      autoRun: 0 as unknown as boolean
    });
    expect(sim.getParams().blockMass).toBe(0.5);
    expect(sim.getParams().boardMass).toBe(10);
    expect(sim.getParams().friction).toBe(0.8);
    expect(sim.getParams().initialVelocity).toBe(12);
    expect(sim.getParams().autoRun).toBe(false);
    sim.setParams({ initialVelocity: Number.POSITIVE_INFINITY });
    expect(sim.getParams().initialVelocity).toBe(12);
    sim.setParams({
      blockMass: Number.NaN,
      boardMass: Number.NEGATIVE_INFINITY,
      friction: 'nope' as unknown as number
    });
    expect(sim.getParams().blockMass).toBe(0.5);
    expect(Number.isFinite(sim.getState().syncTime)).toBe(true);
    const frozen = sim.getState().time;
    sim.step(Number.NaN);
    sim.step(Number.POSITIVE_INFINITY);
    sim.step(-2);
    sim.step(0);
    expect(sim.getState().time).toBe(frozen);
  });

  it('resets to canonical defaults', () => {
    const sim = createBlockBoardSim({
      blockMass: 5,
      autoRun: false,
      initialVelocity: 10
    });
    sim.stepFrame(1);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      blockMass: 2,
      boardMass: 2,
      initialVelocity: 6,
      friction: 0.2,
      autoRun: true
    });
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().blockPosition).toBe(0);
  });

  it('does not wrap the clock at the graph viewport when tc is longer', () => {
    const sim = createBlockBoardSim({
      blockMass: 0.5,
      boardMass: 10,
      initialVelocity: 12,
      friction: 0.05
    });
    const tc = syncTimeFor(sim.getParams());
    expect(loopHorizonFor(sim.getParams())).toBeGreaterThan(C.graphViewTime);
    sim.step(C.graphViewTime + 1);
    expect(sim.getState().time).toBeCloseTo(C.graphViewTime + 1, 6);
    expect(sim.getState().sliding).toBe(true);
    expect(
      wrapBlockBoardTime(tc + 4, loopHorizonFor(sim.getParams()))
    ).toBeLessThan(tc);
  });

  it('keeps apparatus inside the design frame at rest and at common speed', () => {
    const rest = apparatusLayout(
      createBlockBoardSim({ autoRun: false }).getState()
    );
    expect(apparatusInsideFrame(rest)).toBe(true);
    expect(rest.trackEnd.x).toBeLessThan(C.baseWidth);
    expect(rest.board.y + rest.board.h).toBeLessThan(
      C.baseHeight - C.transportClearY
    );
    const synced = apparatusLayout(
      stateAt(createBlockBoardSim().getParams(), 1.5)
    );
    expect(apparatusInsideFrame(synced)).toBe(true);
  });

  it('keeps the full animation stage clear of docked-bottom geometry', () => {
    const gap = C.overlayGapPx;
    const docked = stageTransform(1280, 423, {
      floatingReadout: true,
      overlayPx: 1280,
      overlayTopPx: 265,
      overlayHeightPx: 158
    });
    expect(docked.offsetY + docked.boxH * docked.fit).toBeLessThanOrEqual(
      265 - gap + 1e-6
    );
    expect(docked.offsetY).toBeGreaterThanOrEqual(0);

    const mobile = stageTransform(390, 480, { floatingReadout: false });
    expect(mobile.floatingReadout).toBe(false);
    expect(mobile.fit).toBeCloseTo(
      Math.min(390 / mobile.boxW, 480 / mobile.boxH),
      6
    );

    const frame = graphFrame(624, 147);
    expect(frame.bottom + 28).toBeLessThanOrEqual(147);
    expect(frame.top - 12).toBeGreaterThanOrEqual(0);
    expect(frame.right).toBeLessThanOrEqual(624);
  });
});

describe('block-board scene entry', () => {
  it('applies initial params before the first readout', () => {
    const scene = createBlockBoardScene({
      initialParams: {
        blockMass: 0.5,
        boardMass: 10,
        initialVelocity: 12,
        friction: 0.05,
        autoRun: false
      }
    });
    scene.init();
    expect(scene.getParams()).toMatchObject({
      blockMass: 0.5,
      boardMass: 10,
      initialVelocity: 12,
      friction: 0.05,
      autoRun: false
    });
    expect(
      scene.getReadoutItems().find((item) => item.key === 'sync-time')?.value
    ).toBe('22.86 s');
    scene.dispose();
  });

  it('exposes readout, graph attach, and transport hooks', () => {
    const scene = createBlockBoardScene();
    scene.init();
    const keys = scene.getReadoutItems().map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'block-velocity',
        'board-velocity',
        'common-velocity',
        'relative-displacement',
        'sync-time',
        'time',
        'status'
      ])
    );
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.pauseAll();
    expect(scene.getParams().autoRun).toBe(false);
    scene.startAll();
    expect(scene.getParams().autoRun).toBe(true);
    expect(typeof scene.attachGraphCanvas).toBe('function');
    scene.dispose();
  });
});
