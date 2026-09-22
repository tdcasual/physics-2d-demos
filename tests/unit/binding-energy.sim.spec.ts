import { describe, expect, it } from 'vitest';
import { applySceneUrlParams } from '../../src/app/url-sync';
import { createBindingEnergyScene } from '../../src/scenes/binding-energy/scene.entry';
import { bindingEnergyMeta } from '../../src/scenes/binding-energy/scene.meta';
import {
  BINDING_ENERGY_DATA,
  BINDING_ENERGY_LABELED,
  BINDING_ENERGY_X_TITLE,
  BINDING_ENERGY_Y_TITLE,
  bindingEnergyAt,
  bindingEnergyConstants as C,
  boxInsideFrame,
  boxesOverlap,
  chartX,
  chartY,
  createBindingEnergySim,
  fissionGainAt,
  fusionGainAt,
  hasFloatingReadout,
  labelBox,
  nuclideLabelAnchor,
  nuclideLabelPose,
  stageLayoutFrom,
  stageTransform,
  statusAt,
  totalBindingEnergy
} from '../../src/scenes/binding-energy/scene.sim';

function nuclide(A: number) {
  return BINDING_ENERGY_DATA.find((point) => point.A === A);
}

describe('binding-energy documented curve', () => {
  it('uses H=0, He-4=7.07, Fe-56=8.79 as the taught peak', () => {
    // Table values are the model; Fe-56 is the high-school peak (~8.79 MeV).
    expect(nuclide(1)?.binding).toBe(0);
    expect(nuclide(4)?.binding).toBe(7.07);
    expect(nuclide(56)?.binding).toBe(8.79);
    expect(bindingEnergyAt(56)).toBe(8.79);
    expect(bindingEnergyAt(56)).toBeGreaterThan(bindingEnergyAt(4));
    expect(bindingEnergyAt(56)).toBeGreaterThan(bindingEnergyAt(1));
    expect(bindingEnergyAt(56)).toBeGreaterThan(bindingEnergyAt(89));
    expect(bindingEnergyAt(56)).toBeGreaterThan(bindingEnergyAt(235));
    expect(bindingEnergyAt(56)).toBeGreaterThan(bindingEnergyAt(238));
  });

  it('keeps Kr-89 below iron and above uranium', () => {
    expect(nuclide(89)?.binding).toBe(8.63);
    expect(bindingEnergyAt(89)).toBe(8.63);
    expect(bindingEnergyAt(89)).toBeLessThan(8.79);
    expect(bindingEnergyAt(89)).toBeGreaterThan(bindingEnergyAt(238));
  });

  it('lists U-235 slightly above U-238', () => {
    expect(nuclide(235)?.binding).toBe(7.59);
    expect(nuclide(238)?.binding).toBe(7.57);
    expect(bindingEnergyAt(235)).toBe(7.59);
    expect(bindingEnergyAt(238)).toBe(7.57);
    expect(bindingEnergyAt(235)).toBeGreaterThan(bindingEnergyAt(238));
  });

  it('computes E = A × (E/A) for H, He, Fe, Kr, U-235 and U-238', () => {
    // 1×0 = 0；4×7.07 = 28.28；56×8.79 = 492.24
    expect(totalBindingEnergy(1)).toBe(0);
    expect(totalBindingEnergy(4)).toBeCloseTo(28.28, 8);
    expect(totalBindingEnergy(56)).toBeCloseTo(492.24, 8);
    // 89×8.63 = 768.07；235×7.59 = 1783.65；238×7.57 = 1801.66
    expect(totalBindingEnergy(89)).toBeCloseTo(768.07, 8);
    expect(totalBindingEnergy(235)).toBeCloseTo(1783.65, 8);
    expect(totalBindingEnergy(238)).toBeCloseTo(1801.66, 8);
    const uranium = createBindingEnergySim({ A: 238, autoRun: false });
    expect(uranium.getState().total).toBeCloseTo(1801.66, 1);
  });

  it('interpolates a midpoint between O-16 and Ca-40 by hand', () => {
    // A=28 is halfway from 16 to 40: 7.98 + ½(8.55−7.98) = 8.265
    expect(bindingEnergyAt(28)).toBeCloseTo(8.265, 8);
    expect(Number.isFinite(bindingEnergyAt(28))).toBe(true);
  });

  it('clamps A and keeps interpolation finite at the edges', () => {
    expect(bindingEnergyAt(Number.NaN)).toBe(0);
    expect(bindingEnergyAt(Number.POSITIVE_INFINITY)).toBe(7.57);
    expect(bindingEnergyAt(-40)).toBe(0);
    expect(bindingEnergyAt(400)).toBe(7.57);
    expect(Number.isFinite(bindingEnergyAt(Number.NaN))).toBe(true);
    expect(Number.isFinite(totalBindingEnergy(Number.NEGATIVE_INFINITY))).toBe(
      true
    );
    const sim = createBindingEnergySim({ A: 999, autoRun: false });
    expect(sim.getParams().A).toBe(238);
    sim.setParams({ A: -8 });
    expect(sim.getParams().A).toBe(1);
  });
});

describe('binding-energy fusion and fission direction', () => {
  it('gives fusion gain only for A < 56', () => {
    // H-1: 8.79 − 0 = 8.79；He-4: 8.79 − 7.07 = 1.72
    expect(fusionGainAt(1)).toBeCloseTo(8.79, 8);
    expect(fusionGainAt(4)).toBeCloseTo(1.72, 8);
    expect(fissionGainAt(1)).toBe(0);
    expect(fissionGainAt(4)).toBe(0);
    expect(statusAt(1)).toBe('轻核·可聚变');
    expect(statusAt(4)).toBe('轻核·可聚变');
  });

  it('gives fission gain only for A > 56', () => {
    // Kr: 8.79 − 8.63 = 0.16；U-235: 8.79 − 7.59 = 1.20；U-238: 8.79 − 7.57 = 1.22
    expect(fissionGainAt(89)).toBeCloseTo(0.16, 8);
    expect(fissionGainAt(235)).toBeCloseTo(1.2, 8);
    expect(fissionGainAt(238)).toBeCloseTo(1.22, 8);
    expect(fusionGainAt(89)).toBe(0);
    expect(fusionGainAt(235)).toBe(0);
    expect(fusionGainAt(238)).toBe(0);
    expect(statusAt(89)).toBe('重核·可裂变');
    expect(statusAt(238)).toBe('重核·可裂变');
  });

  it('reports zero gain and peak status at and near Fe-56', () => {
    expect(fusionGainAt(56)).toBe(0);
    expect(fissionGainAt(56)).toBe(0);
    expect(statusAt(56)).toBe('稳定巅峰');
    expect(statusAt(52)).toBe('稳定巅峰');
    expect(statusAt(60)).toBe('稳定巅峰');
    const iron = createBindingEnergySim({ A: 56, autoRun: false }).getState();
    expect(iron.fusionGain).toBe(0);
    expect(iron.fissionGain).toBe(0);
    expect(iron.status).toBe('稳定巅峰');
    expect(iron.fusionGain).not.toBe(iron.fissionGain + 1);
  });

  it('never reports the same nonzero gain for both directions', () => {
    for (const A of [1, 4, 12, 40, 56, 89, 140, 235, 238]) {
      const fusion = fusionGainAt(A);
      const fission = fissionGainAt(A);
      expect(fusion).toBeGreaterThanOrEqual(0);
      expect(fission).toBeGreaterThanOrEqual(0);
      if (A < 56) {
        expect(fusion).toBeGreaterThan(0);
        expect(fission).toBe(0);
      } else if (A > 56) {
        expect(fission).toBeGreaterThan(0);
        expect(fusion).toBe(0);
      } else {
        expect(fusion).toBe(0);
        expect(fission).toBe(0);
      }
    }
  });
});

describe('binding-energy transport and keyboard', () => {
  it('freezes on pause and advances with stepFrame', () => {
    const sim = createBindingEnergySim({ A: 56, autoRun: false });
    sim.step(2);
    expect(sim.getParams().A).toBe(56);
    expect(sim.getState().time).toBe(0);
    sim.stepFrame(1);
    // speed = 10 A/s toward heavier nuclei from A=56 (direction +1 below Fe? 56 → -1)
    expect(sim.getState().time).toBeCloseTo(1, 8);
    expect(sim.getState().cursorA).not.toBe(56);
  });

  it('treats adapter arrow keys as integer A nudges even while paused', () => {
    const sim = createBindingEnergySim({ A: 56, autoRun: false });
    sim.step(-C.keyboardDt);
    expect(sim.getParams().A).toBe(55);
    sim.step(C.keyboardDt);
    expect(sim.getParams().A).toBe(56);
    sim.nudgeA(1);
    expect(sim.getParams().A).toBe(57);
    sim.nudgeA(-1000);
    expect(sim.getParams().A).toBe(1);
    sim.nudgeA(1000);
    expect(sim.getParams().A).toBe(238);
  });

  it('auto-runs toward iron from uranium then reverses at the ends', () => {
    const sim = createBindingEnergySim({ A: 238, autoRun: true });
    expect(sim.getState().direction).toBe(-1);
    sim.step(1);
    expect(sim.getState().cursorA).toBeCloseTo(228, 5);
    sim.setParams({ A: 1 });
    expect(sim.getState().direction).toBe(1);
    sim.step(1);
    expect(sim.getState().cursorA).toBeCloseTo(11, 5);
    sim.setParams({ A: 238 });
    sim.step(40);
    expect(sim.getParams().A).toBe(1);
    sim.step(1);
    expect(sim.getState().cursorA).toBeGreaterThan(1);
  });

  it('resets to construction defaults and ignores bad steps', () => {
    const sim = createBindingEnergySim({
      A: 4,
      autoRun: 0 as unknown as boolean,
      showRegions: 'false' as unknown as boolean
    });
    expect(sim.getParams()).toMatchObject({
      A: 4,
      autoRun: false,
      showRegions: false
    });
    sim.setParams({
      A: 80,
      autoRun: '1' as unknown as boolean,
      showRegions: 0 as unknown as boolean
    });
    sim.step(1);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      A: 4,
      autoRun: false,
      showRegions: false
    });
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().cursorA).toBe(4);
    const frozen = sim.getState().cursorA;
    sim.step(Number.NaN);
    sim.step(0);
    expect(sim.getState().cursorA).toBe(frozen);
    expect(sim.getSnapshot()).toEqual(sim.getState());
  });
});

describe('binding-energy URL params and readout', () => {
  it('applies A / autoRun / showRegions from URL-like values', () => {
    const canvas = document.createElement('canvas');
    const scene = createBindingEnergyScene({ canvas });
    window.history.replaceState(
      {},
      '',
      '/src/pages/binding-energy.html?A=56&autoRun=0&showRegions=0'
    );
    applySceneUrlParams(bindingEnergyMeta, {
      scene,
      controls: {
        setValue() {},
        setActive() {}
      },
      mount: document.createElement('div'),
      scheduleRender: () => scene.render()
    });
    expect(scene.getParams()).toMatchObject({
      A: 56,
      autoRun: false,
      showRegions: false
    });
    const items = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(items.A).toBe('56');
    expect(items.binding).toBe('8.79 MeV');
    expect(items.total).toBe('492.2 MeV');
    expect(items.status).toBe('稳定巅峰');
    expect(items.gain).toBe('0（铁峰）');
    expect(items.formula).toBe('A × (E/A)');
    scene.dispose();
    window.history.replaceState({}, '', '/');
  });

  it('reports fission gain for U-238 and fusion gain for He-4', () => {
    const canvas = document.createElement('canvas');
    const scene = createBindingEnergyScene({ canvas });
    scene.setParams({ A: 238, autoRun: false });
    const heavy = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(heavy.gain).toBe('1.22 MeV');
    expect(heavy.status).toBe('重核·可裂变');
    scene.setParams({ A: 4 });
    const light = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(light.gain).toBe('1.72 MeV');
    expect(light.status).toBe('轻核·可聚变');
    scene.dispose();
  });
});

describe('binding-energy U label split and stage', () => {
  it('separates U-235 and U-238 label anchors', () => {
    const u235 = nuclideLabelAnchor('U-235');
    const u238 = nuclideLabelAnchor('U-238');
    const p235 = {
      x: chartX(235) + u235.dx,
      y: chartY(7.59) + u235.dy
    };
    const p238 = {
      x: chartX(238) + u238.dx,
      y: chartY(7.57) + u238.dy
    };
    expect(u235.align).toBe('right');
    expect(u238.align).toBe('right');
    expect(u235.dy).toBeLessThan(0);
    expect(u238.dy).toBeGreaterThan(0);
    expect(Math.hypot(p235.x - p238.x, p235.y - p238.y)).toBeGreaterThan(24);
    const fe = nuclideLabelAnchor('Fe-56');
    const kr = nuclideLabelAnchor('Kr-89');
    const pFe = { x: chartX(56) + fe.dx, y: chartY(8.79) + fe.dy };
    const pKr = { x: chartX(89) + kr.dx, y: chartY(8.63) + kr.dy };
    expect(fe.align).toBe('left');
    expect(fe.dy).toBeGreaterThan(0);
    expect(Math.hypot(pFe.x - pKr.x, pFe.y - pKr.y)).toBeGreaterThan(24);
  });

  it('keeps inflated nuclide labels inside the base frame', () => {
    const font = C.labelFontBound;
    for (const symbol of BINDING_ENERGY_LABELED) {
      const pose = nuclideLabelPose(symbol);
      const box = labelBox(symbol, pose.x, pose.y, pose.align, font);
      expect(boxInsideFrame(box), `${symbol} ${JSON.stringify(box)}`).toBe(
        true
      );
    }
    const u235 = nuclideLabelPose('U-235');
    const u238 = nuclideLabelPose('U-238');
    expect(
      boxesOverlap(
        labelBox('U-235', u235.x, u235.y, u235.align, font),
        labelBox('U-238', u238.x, u238.y, u238.align, font),
        4
      )
    ).toBe(false);
    const fe = nuclideLabelPose('Fe-56');
    const kr = nuclideLabelPose('Kr-89');
    const he = nuclideLabelPose('He-4');
    const carbon = nuclideLabelPose('C-12');
    expect(
      boxesOverlap(
        labelBox('Fe-56', fe.x, fe.y, fe.align, font),
        labelBox('Kr-89', kr.x, kr.y, kr.align, font),
        4
      )
    ).toBe(false);
    expect(
      boxesOverlap(
        labelBox('He-4', he.x, he.y, he.align, font),
        labelBox('C-12', carbon.x, carbon.y, carbon.align, font),
        4
      )
    ).toBe(false);
    const title = labelBox(
      BINDING_ENERGY_Y_TITLE[0],
      C.chartLeft + 8,
      C.chartTop - 16 - font * 1.2,
      'left',
      font
    );
    const title2 = labelBox(
      BINDING_ENERGY_Y_TITLE[1],
      C.chartLeft + 8,
      C.chartTop - 16,
      'left',
      font
    );
    const feBox = labelBox('Fe-56', fe.x, fe.y, fe.align, font);
    expect(boxesOverlap(title, feBox, 6)).toBe(false);
    expect(boxesOverlap(title2, feBox, 6)).toBe(false);
    expect(BINDING_ENERGY_X_TITLE).toBe('质量数 A');
    expect(u238.x + 1e-6).toBeLessThanOrEqual(C.baseWidth - C.labelInset);
  });

  it('keeps the chart inside the animation-only frame', () => {
    expect(C.baseWidth).toBe(880);
    expect(C.baseHeight).toBe(640);
    expect('panelWidth' in C).toBe(false);
    expect('formulaTop' in C).toBe(false);
    expect(C.chartRight).toBeLessThan(C.baseWidth);
    expect(C.chartBottom).toBeLessThan(C.baseHeight - C.transportClearY);
  });

  it('fits the stage when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(880);
    expect(t.boxH).toBe(640);
    expect(t.fit).toBeCloseTo(Math.min(720 / 880, 500 / 640), 6);
  });

  it('treats mobile-stack as a non-floating readout', () => {
    const root = document.createElement('div');
    root.className = 'mobile-stack-layout';
    root.setAttribute('data-readout-overlay', 'false');
    root.setAttribute('data-testid', 'mobile-stack-layout');
    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    document.body.appendChild(root);
    expect(hasFloatingReadout(canvas)).toBe(false);
    expect(stageLayoutFrom(canvas)).toEqual({
      floatingReadout: false,
      overlayPx: 0
    });
    root.remove();
  });
});
