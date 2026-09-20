import { describe, expect, it } from 'vitest';
import {
  fitFunctionalUnionToParent,
  fitTransformToParent,
  narrowInstrumentScale,
  unionClientRects
} from '../../src/instruments/_utils/fit-visual';

describe('fit-visual', () => {
  it('unions painted element rects', () => {
    const root = document.createElement('div');
    const a = document.createElement('div');
    a.className = 'knob';
    a.getBoundingClientRect = () =>
      ({
        left: 100,
        right: 140,
        top: 10,
        bottom: 40,
        width: 40,
        height: 30
      }) as DOMRect;
    const b = document.createElement('div');
    b.className = 'lens-assembly';
    b.getBoundingClientRect = () =>
      ({
        left: 20,
        right: 90,
        top: 8,
        bottom: 80,
        width: 70,
        height: 72
      }) as DOMRect;
    root.append(a, b);
    const union = unionClientRects(root, ['.knob', '.lens-assembly']);
    expect(union).toEqual({ left: 20, right: 140, top: 8, bottom: 80 });
  });

  it('scales and centers a union inside the parent with padding', () => {
    const parent = document.createElement('div');
    parent.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 400,
        top: 0,
        bottom: 200,
        width: 400,
        height: 200
      }) as DOMRect;
    const fit = fitTransformToParent(
      parent,
      { left: 0, right: 800, top: 0, bottom: 200 },
      { pad: 0, maxScale: 2 }
    );
    expect(fit.scale).toBeCloseTo(0.5, 6);
    expect(fit.tx).toBeCloseTo(0, 6);
    expect(fit.ty).toBeCloseTo(50, 6);
  });

  it('uses the transforming root origin so an offset union still centers', () => {
    const parent = document.createElement('div');
    parent.getBoundingClientRect = () =>
      ({
        left: 10,
        right: 410,
        top: 20,
        bottom: 220,
        width: 400,
        height: 200
      }) as DOMRect;
    const root = document.createElement('div');
    root.getBoundingClientRect = () =>
      ({
        left: 10,
        right: 410,
        top: 20,
        bottom: 220,
        width: 400,
        height: 200
      }) as DOMRect;
    const fit = fitTransformToParent(
      parent,
      { left: 110, right: 910, top: 20, bottom: 220 },
      { pad: 0, maxScale: 2, root }
    );
    expect(fit.scale).toBeCloseTo(0.5, 6);
    // targetLeft = 10; tx = 10 - 10 - (110-10)*0.5 = -50
    expect(fit.tx).toBeCloseTo(-50, 6);
    expect(fit.ty).toBeCloseTo(50, 6);
  });

  it('contains the full union when the functional region stays legible', () => {
    const parent = document.createElement('div');
    parent.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 800,
        top: 0,
        bottom: 400,
        width: 800,
        height: 400
      }) as DOMRect;
    const fit = fitFunctionalUnionToParent(
      parent,
      { left: 0, right: 400, top: 0, bottom: 200 },
      { left: 0, right: 180, top: 0, bottom: 180 },
      { pad: 0, maxScale: 2, minFunctionalPx: 140 }
    );
    expect(fit.scale).toBeCloseTo(2, 6);
    expect(fit.tx).toBeCloseTo(0, 6);
    expect(fit.ty).toBeCloseTo(0, 6);
  });

  it('does not shrink a wide instrument just to contain unused sleeve', () => {
    const parent = document.createElement('div');
    parent.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 375,
        top: 0,
        bottom: 220,
        width: 375,
        height: 220
      }) as DOMRect;
    const fit = fitFunctionalUnionToParent(
      parent,
      { left: 0, right: 1372, top: 0, bottom: 360 },
      { left: 0, right: 637, top: 0, bottom: 360 },
      { pad: 0, maxScale: 2, minFunctionalPx: 80 }
    );
    expect(fit.scale).toBeCloseTo(375 / 637, 6);
    expect(fit.tx).toBeCloseTo(0, 6);
  });

  it('left-aligns the functional union when containing the full instrument is illegible', () => {
    const parent = document.createElement('div');
    parent.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 375,
        top: 0,
        bottom: 160,
        width: 375,
        height: 160
      }) as DOMRect;
    const fit = fitFunctionalUnionToParent(
      parent,
      { left: 0, right: 1372, top: 0, bottom: 360 },
      { left: 40, right: 677, top: 0, bottom: 360 },
      { pad: 0, maxScale: 2, minFunctionalPx: 140 }
    );
    // containFull ≈ 0.273 → functional height 98px < 140, so left-align functional
    expect(fit.scale).toBeCloseTo(160 / 360, 6);
    expect(fit.tx).toBeCloseTo(-40 * (160 / 360), 6);
    expect(fit.ty).toBeCloseTo(0, 6);
  });

  it('uses the functional box when full-contain shrinks the eyepiece below the floor', () => {
    const parent = document.createElement('div');
    parent.getBoundingClientRect = () =>
      ({
        left: 10,
        right: 385,
        top: 20,
        bottom: 180,
        width: 375,
        height: 160
      }) as DOMRect;
    const root = document.createElement('div');
    root.getBoundingClientRect = () =>
      ({
        left: 10,
        right: 385,
        top: 20,
        bottom: 180,
        width: 375,
        height: 160
      }) as DOMRect;
    const fit = fitFunctionalUnionToParent(
      parent,
      { left: 10, right: 1382, top: 20, bottom: 380 },
      { left: 10, right: 647, top: 20, bottom: 380 },
      { pad: 0, maxScale: 2, minFunctionalPx: 200, root }
    );
    // containFull = min(375/1372, 160/360) ≈ 0.273 → funcH=98 < 200
    // functional-fit scale = min(375/637, 160/360) ≈ 0.444
    expect(fit.scale).toBeCloseTo(160 / 360, 6);
    expect(fit.tx).toBeCloseTo(0, 6);
    expect(fit.ty).toBeCloseTo(0, 6);
  });

  it('narrow scale is width-based and ignores a collapsed host height', () => {
    expect(narrowInstrumentScale(639, 425)).toBeCloseTo(1, 6);
    expect(narrowInstrumentScale(375, 425)).toBeCloseTo((375 - 8) / 425, 6);
    expect(narrowInstrumentScale(100, 425)).toBeCloseTo(0.3, 6);
  });
});
