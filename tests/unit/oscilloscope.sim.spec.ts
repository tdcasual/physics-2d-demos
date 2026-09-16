import { describe, expect, it } from 'vitest';
import { createOscilloscopeScene } from '../../src/scenes/oscilloscope/scene.entry';
import {
  apparatusInsideFrame,
  apparatusLayout,
  asBool,
  createOscilloscopeSim,
  findOverlayPanels,
  graphFrames,
  hasFloatingReadout,
  isIntegerRatio,
  mapStagePoint,
  oscilloscopeConstants as C,
  scanPeriod,
  scanVoltage,
  signalVoltage,
  stableRatio,
  stageLayoutFrom,
  stageTransform,
  stateAt,
  sweepFraction,
  sweepWaveform,
  visualTime
} from '../../src/scenes/oscilloscope/scene.sim';

describe('oscilloscope simulation', () => {
  it('treats fy = n fx as the stable-trace condition', () => {
    // Textbook CRT lock: fy Tx = n, i.e. fy/fx ∈ ℤ.
    // 210 / 70 = 3; 140 / 70 = 2; 70 / 70 = 1.
    expect(stableRatio(210, 70)).toBe(3);
    expect(stableRatio(140, 70)).toBe(2);
    expect(stableRatio(70, 70)).toBe(1);
    expect(isIntegerRatio(210, 70)).toBe(true);
    expect(isIntegerRatio(140, 70)).toBe(true);
    expect(createOscilloscopeSim().getState().stable).toBe(true);
    expect(createOscilloscopeSim().getState().cyclesPerScan).toBe(3);

    // 200 / 70 = 20/7 ≈ 2.857 is not an integer.
    expect(stableRatio(200, 70)).toBeCloseTo(20 / 7, 10);
    expect(isIntegerRatio(200, 70)).toBe(false);
    expect(
      createOscilloscopeSim({ signalFrequency: 200 }).getState().stable
    ).toBe(false);
  });

  it('deflects Y with a sine of the signal and sweeps X left to right', () => {
    const params = createOscilloscopeSim({ autoRun: false }).getParams();
    // Uy = Ay sin(2π fy t_vis). Quarter period of 210 Hz: t_vis = 1/840 s
    // → Uy = 35, y_norm = 35/80 = 0.4375.
    const quarterVis = 1 / (4 * 210);
    const quarterSim = quarterVis / C.visualTimeScale;
    expect(signalVoltage(params, quarterSim)).toBeCloseTo(35, 8);
    expect(stateAt(params, quarterSim).electronY).toBeCloseTo(35 / 80, 8);
    expect(stateAt(params, 0).electronY).toBeCloseTo(0, 8);

    // One scan period on the teaching clock: T_x = 1/fx = 1/70 s of t_vis.
    const txSim = scanPeriod(70) / C.visualTimeScale;
    expect(sweepFraction(params, 0)).toBeCloseTo(0, 8);
    expect(sweepFraction(params, txSim / 2)).toBeCloseTo(0.5, 8);
    expect(sweepFraction(params, txSim)).toBeCloseTo(0, 8);
    expect(scanVoltage(params, txSim / 2)).toBeCloseTo(40 * 0.5, 8);

    const sim = createOscilloscopeSim({ autoRun: true });
    sim.step(txSim * 0.9);
    const beforeReset = sim.getState().electronX;
    expect(beforeReset).toBeGreaterThan(0.8);
    sim.step(txSim * 0.2);
    expect(sim.getState().electronX).toBeLessThan(beforeReset);
  });

  it('keeps the phosphor path fixed only when the ratio is an integer', () => {
    const txSim = scanPeriod(70) / C.visualTimeScale;
    const locked = createOscilloscopeSim({
      signalFrequency: 210,
      scanFrequency: 70,
      autoRun: false
    }).getParams();
    const a = sweepWaveform(locked, 0.01);
    const b = sweepWaveform(locked, 0.01 + txSim);
    expect(a.length).toBeGreaterThan(8);
    a.forEach((point, index) => {
      expect(point.y).toBeCloseTo(b[index]?.y ?? Number.NaN, 8);
    });
    // Peak of n = 3 sine in one sweep: s = 1/12 → y = +Ay/Amax = 35/80.
    const peak = a[Math.round((a.length - 1) / 12)];
    expect(peak?.y).toBeCloseTo(35 / 80, 2);

    const drifting = createOscilloscopeSim({
      signalFrequency: 200,
      scanFrequency: 70,
      autoRun: false
    }).getParams();
    const c = sweepWaveform(drifting, 0.01);
    const d = sweepWaveform(drifting, 0.01 + txSim);
    const shifted = c.some(
      (point, index) => Math.abs(point.y - (d[index]?.y ?? point.y)) > 0.05
    );
    expect(shifted).toBe(true);
  });

  it('centers X and draws a vertical locus when the timebase is off', () => {
    const sim = createOscilloscopeSim({ scanEnabled: false, autoRun: false });
    const state = sim.getState();
    expect(state.electronX).toBe(0.5);
    expect(state.screenX).toBe(0);
    expect(scanVoltage(state.params, 0.2)).toBe(0);
    const wave = sweepWaveform(state.params, 0.2);
    expect(wave.every((point) => point.x === 0.5)).toBe(true);
    expect(Math.max(...wave.map((point) => point.y))).toBeCloseTo(
      state.params.signalAmplitude / C.ampMax,
      8
    );
  });

  it('clamps edges, parses boolean URL values, and ignores bad steps', () => {
    expect(asBool(0, true)).toBe(false);
    expect(asBool('0', true)).toBe(false);
    expect(asBool('false', true)).toBe(false);
    expect(asBool(1, false)).toBe(true);
    expect(asBool('true', false)).toBe(true);

    const sim = createOscilloscopeSim({
      signalAmplitude: 999,
      signalFrequency: 0,
      scanAmplitude: -4,
      scanFrequency: 0,
      autoRun: 0 as unknown as boolean,
      scanEnabled: 'false' as unknown as boolean
    });
    expect(sim.getParams().signalAmplitude).toBe(C.ampMax);
    expect(sim.getParams().signalFrequency).toBe(C.signalFreqMin);
    expect(sim.getParams().scanAmplitude).toBe(C.ampMin);
    expect(sim.getParams().scanFrequency).toBe(C.scanFreqMin);
    expect(sim.getParams().autoRun).toBe(false);
    expect(sim.getParams().scanEnabled).toBe(false);
    const frozen = sim.getState().time;
    sim.step(1);
    sim.step(Number.NaN);
    sim.step(Number.POSITIVE_INFINITY);
    sim.step(-2);
    expect(sim.getState().time).toBe(frozen);
    sim.stepFrame(C.frameDt);
    expect(sim.getState().time).toBeCloseTo(C.frameDt, 8);
  });

  it('resets to the construction snapshot, not later slider values', () => {
    const sim = createOscilloscopeSim({
      signalFrequency: 140,
      autoRun: false,
      scanEnabled: false
    });
    sim.setParams({ signalFrequency: 300, autoRun: true, scanEnabled: true });
    sim.stepFrame(0.2);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      signalFrequency: 140,
      autoRun: false,
      scanEnabled: false
    });
    expect(sim.getState().time).toBe(0);
    expect(visualTime(0)).toBe(0);
  });

  it('keeps the tube and scope inside the animation frame', () => {
    const rest = apparatusLayout(
      createOscilloscopeSim({ autoRun: false }).getState()
    );
    expect(apparatusInsideFrame(rest)).toBe(true);
    expect(rest.tube.right).toBeLessThan(C.baseWidth);
    expect(rest.scope.cy + rest.scope.r).toBeLessThan(C.baseHeight);
    expect(rest.labels.every((label) => label.y < C.baseHeight)).toBe(true);
    const deflected = apparatusLayout(
      stateAt(
        createOscilloscopeSim({ signalAmplitude: 80 }).getParams(),
        1 / (4 * 210 * C.visualTimeScale)
      )
    );
    expect(apparatusInsideFrame(deflected)).toBe(true);
    expect(deflected.screenHit.y).not.toBeCloseTo(rest.screenHit.y, 2);
  });

  it('fits the design frame on desktop, overlay, and 390px mobile', () => {
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
    expect(
      docked.offsetX + docked.boxW * docked.fit * docked.scaleX
    ).toBeLessThanOrEqual(1280 + 1e-6);

    const mobile = stageTransform(390, 480, { floatingReadout: false });
    expect(mobile.floatingReadout).toBe(false);
    expect(mobile.fit).toBeCloseTo(
      Math.min(390 / mobile.boxW, 480 / mobile.boxH),
      6
    );
    expect(mobile.boxW * mobile.fit).toBeLessThanOrEqual(390 + 1e-6);
    expect(mobile.boxH * mobile.fit).toBeLessThanOrEqual(480 + 1e-6);

    const frames = graphFrames(624, 240);
    expect(frames.signal.top).toBeGreaterThanOrEqual(0);
    expect(frames.scan.bottom).toBeLessThanOrEqual(240);
    expect(frames.signal.right).toBeLessThanOrEqual(624);
    expect(frames.scan.top).toBeGreaterThan(frames.signal.bottom);
  });
});

function mockRect(
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON() {
      return {};
    }
  } as DOMRect;
}

function expectApparatusClearOfOverlay(
  cssW: number,
  cssH: number,
  layout: Parameters<typeof stageTransform>[2],
  overlayLeft: number
): ReturnType<typeof stageTransform> {
  const pose = stageTransform(cssW, cssH, layout);
  const rest = apparatusLayout(
    createOscilloscopeSim({ autoRun: false }).getState()
  );
  const gap = C.overlayGapPx;
  const points = [
    { x: rest.tube.right, y: rest.tube.centerY },
    rest.screenHit,
    { x: rest.scope.cx + rest.scope.r, y: rest.scope.cy },
    ...rest.beam,
    ...rest.labels
  ];
  for (const point of points) {
    const css = mapStagePoint(point.x, point.y, pose);
    expect(css.x).toBeGreaterThanOrEqual(0);
    expect(css.x).toBeLessThanOrEqual(overlayLeft - gap + 1e-6);
    expect(css.x).toBeLessThanOrEqual(cssW + 1e-6);
    expect(css.y).toBeGreaterThanOrEqual(-1e-6);
    expect(css.y).toBeLessThanOrEqual(cssH + 1e-6);
  }
  expect(pose.offsetX).toBeGreaterThanOrEqual(0);
  expect(pose.offsetX + pose.boxW * pose.fit * pose.scaleX).toBeLessThanOrEqual(
    cssW + 1e-6
  );
  return pose;
}

describe('oscilloscope floating readout geometry', () => {
  it('keeps the tube and screen left of a 1280px desktop side overlay', () => {
    // Auditor viewport: card covers x≈1068..1260 of a 1280 canvas.
    const overlayLeft = 1068;
    const pose = expectApparatusClearOfOverlay(
      1280,
      720,
      {
        floatingReadout: true,
        overlayPx: 1280 - overlayLeft,
        overlayTopPx: 60,
        overlayHeightPx: 280
      },
      overlayLeft
    );
    expect(pose.floatingReadout).toBe(true);
    expect(pose.offsetX + pose.boxW * pose.fit).toBeLessThanOrEqual(
      overlayLeft - C.overlayGapPx + 1e-6
    );
  });

  it('does not stretch a tall right-side card into a full-width dock', () => {
    // Expanded 数据读数 is top-right, not docked-bottom, even when it
    // crosses 45% of the animation height.
    const overlayLeft = 1068;
    const pose = stageTransform(1280, 423, {
      floatingReadout: true,
      overlayPx: 1280 - overlayLeft,
      overlayTopPx: 60,
      overlayHeightPx: 280
    });
    expect(pose.scaleX).toBeCloseTo(1, 8);
    expect(
      pose.offsetX + pose.boxW * pose.fit * pose.scaleX
    ).toBeLessThanOrEqual(overlayLeft - C.overlayGapPx + 1e-6);
    expectApparatusClearOfOverlay(
      1280,
      423,
      {
        floatingReadout: true,
        overlayPx: 1280 - overlayLeft,
        overlayTopPx: 60,
        overlayHeightPx: 280
      },
      overlayLeft
    );
  });

  it('clears the overlay on the split-right-graph-bottom animation slot', () => {
    // 1280 viewport, 0.32 left pane → ~870px animation canvas.
    const cssW = 870;
    const overlayPx = 212;
    expectApparatusClearOfOverlay(
      cssW,
      423,
      {
        floatingReadout: true,
        overlayPx,
        overlayTopPx: 60,
        overlayHeightPx: 220
      },
      cssW - overlayPx
    );
  });

  it('treats mobile-stack as non-floating and split-right / lab as floating', () => {
    const mobile = document.createElement('div');
    mobile.className = 'mobile-stack-layout';
    mobile.dataset.testid = 'mobile-stack-layout';
    const mobileCanvas = document.createElement('canvas');
    mobile.appendChild(mobileCanvas);
    document.body.appendChild(mobile);
    expect(hasFloatingReadout(mobileCanvas)).toBe(false);
    expect(stageLayoutFrom(mobileCanvas)).toEqual({
      floatingReadout: false,
      overlayPx: 0
    });
    mobile.remove();

    const split = document.createElement('div');
    split.className = 'layout-srgb-graph-bottom';
    split.dataset.testid = 'split-right-graph-bottom-layout';
    const splitCanvas = document.createElement('canvas');
    split.appendChild(splitCanvas);
    document.body.appendChild(split);
    expect(hasFloatingReadout(splitCanvas)).toBe(true);
    expect(stageLayoutFrom(splitCanvas).floatingReadout).toBe(true);
    expect(stageLayoutFrom(splitCanvas).overlayPx).toBe(C.overlayFallbackPx);
    split.remove();

    const lab = document.createElement('div');
    lab.className = 'lab-stage-layout';
    lab.dataset.testid = 'lab-stage-layout';
    const labCanvas = document.createElement('canvas');
    lab.appendChild(labCanvas);
    document.body.appendChild(lab);
    expect(hasFloatingReadout(labCanvas)).toBe(true);
    lab.remove();
  });

  it('measures an expanded split-right panel that is a canvas sibling', () => {
    const root = document.createElement('div');
    root.className = 'layout-srgb-graph-bottom';
    root.dataset.testid = 'split-right-graph-bottom-layout';
    const slot = document.createElement('div');
    const canvas = document.createElement('canvas');
    const panel = document.createElement('div');
    panel.className = 'srgb-readout-panel readout-panel';
    panel.style.position = 'absolute';
    canvas.getBoundingClientRect = () => mockRect(0, 0, 1280, 720);
    panel.getBoundingClientRect = () => mockRect(1068, 60, 192, 280);
    slot.append(canvas, panel);
    root.appendChild(slot);
    document.body.appendChild(root);

    expect(findOverlayPanels(canvas)).toEqual([panel]);
    const hint = stageLayoutFrom(canvas);
    expect(hint.floatingReadout).toBe(true);
    expect(hint.overlayPx).toBe(Math.max(1280 - 1068, C.overlayFallbackPx));
    expect(hint.overlayTopPx).toBe(60);
    expect(hint.overlayHeightPx).toBe(280);
    expectApparatusClearOfOverlay(1280, 720, hint, 1068);
    root.remove();
  });

  it('measures a lab 数据读数 float that is not a canvas sibling', () => {
    const root = document.createElement('div');
    root.className = 'lab-stage-layout';
    root.dataset.testid = 'lab-stage-layout';
    const anim = document.createElement('div');
    anim.className = 'lab-stage-slot';
    const canvas = document.createElement('canvas');
    anim.appendChild(canvas);
    const data = document.createElement('div');
    data.className = 'lab-float lab-float-data';
    data.style.position = 'absolute';
    canvas.getBoundingClientRect = () => mockRect(0, 0, 1280, 720);
    data.getBoundingClientRect = () => mockRect(1068, 60, 192, 280);
    root.append(anim, data);
    document.body.appendChild(root);

    expect(canvas.parentElement?.querySelector('.lab-float-data')).toBeNull();
    expect(findOverlayPanels(canvas)).toEqual([data]);
    const hint = stageLayoutFrom(canvas);
    expect(hint.floatingReadout).toBe(true);
    expect(hint.overlayPx).toBe(Math.max(1280 - 1068, C.overlayFallbackPx));
    expectApparatusClearOfOverlay(1280, 720, hint, 1068);
    root.remove();
  });

  it('reserves the fallback gutter when the collapsed chip is narrower', () => {
    const root = document.createElement('div');
    root.className = 'layout-srgb-graph-bottom';
    const slot = document.createElement('div');
    const canvas = document.createElement('canvas');
    const panel = document.createElement('div');
    panel.className = 'srgb-readout-panel readout-panel is-collapsed';
    panel.style.position = 'absolute';
    canvas.getBoundingClientRect = () => mockRect(0, 0, 1280, 720);
    panel.getBoundingClientRect = () => mockRect(1188, 60, 80, 44);
    slot.append(canvas, panel);
    root.appendChild(slot);
    document.body.appendChild(root);

    const hint = stageLayoutFrom(canvas);
    expect(hint.overlayPx).toBe(C.overlayFallbackPx);
    expectApparatusClearOfOverlay(1280, 720, hint, 1280 - C.overlayFallbackPx);
    root.remove();
  });
});

describe('oscilloscope scene entry', () => {
  it('applies URL initial params, including boolean flags, before the first readout', () => {
    const scene = createOscilloscopeScene({
      initialParams: {
        signalFrequency: 140,
        scanFrequency: 70,
        autoRun: false,
        scanEnabled: false
      }
    });
    scene.init();
    expect(scene.getParams()).toMatchObject({
      signalFrequency: 140,
      scanFrequency: 70,
      autoRun: false,
      scanEnabled: false
    });
    expect(scene.getTransportState().isPlaying).toBe(false);
    const ratio = scene
      .getReadoutItems()
      .find((item) => item.key === 'cycles-per-scan')?.value;
    expect(ratio).toBe('2');
    const waveform = scene
      .getReadoutItems()
      .find((item) => item.key === 'stable')?.value;
    expect(waveform).toBe('无扫描');
    scene.dispose();
  });

  it('accepts 0/1 and "false" flags through setParams after init', () => {
    const scene = createOscilloscopeScene({
      initialParams: { autoRun: 0 as unknown as boolean }
    });
    scene.init();
    expect(scene.getParams().autoRun).toBe(false);
    scene.setParams({
      scanEnabled: 0 as unknown as boolean,
      autoRun: 'true' as unknown as boolean
    });
    expect(scene.getParams().scanEnabled).toBe(false);
    expect(scene.getParams().autoRun).toBe(true);
    scene.pauseAll();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.startAll();
    expect(scene.getTransportState().isPlaying).toBe(true);
    expect(typeof scene.attachGraphCanvas).toBe('function');
    scene.dispose();
  });
});
