import { describe, it, expect } from 'vitest';
import { drawFriction } from '../../src/scenes/electrification/renderer/draw-friction';
import { drawInduction } from '../../src/scenes/electrification/renderer/draw-induction';
import { drawContact } from '../../src/scenes/electrification/renderer/draw-contact';
import {
  drawGlassRod,
  drawSilk,
  drawConductor,
  drawGround,
  drawChargedSphere
} from '../../src/scenes/electrification/renderer/draw-objects';
import {
  drawNetCharges,
  drawAtomCharges,
  drawTransferArrow
} from '../../src/scenes/electrification/renderer/draw-charges';
import {
  drawFieldLinesFromPoint,
  drawFieldLinesBetween
} from '../../src/scenes/electrification/renderer/draw-field-lines';
import { drawStepIndicator } from '../../src/scenes/electrification/renderer/draw-step-indicator';
import type { ElectrificationSnapshot } from '../../src/scenes/electrification/scene.sim';

function makeCtx(): {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  // happy-dom does not implement quadraticCurveTo
  if (!ctx.quadraticCurveTo) {
    ctx.quadraticCurveTo = () => {};
  }
  return { ctx, canvas };
}

function createSnapshot(
  scene: ElectrificationSnapshot['state']['scene'],
  stepIndex: number,
  leftCharge: number,
  rightCharge: number
): ElectrificationSnapshot {
  return {
    state: {
      scene,
      stepIndex,
      explanation: 'test explanation',
      nextActionLabel: 'test action',
      leftCharge,
      rightCharge
    }
  };
}

describe('electrification renderer', () => {
  describe('draw-objects', () => {
    it('draws glass rod without throwing', () => {
      const { ctx } = makeCtx();
      expect(() => drawGlassRod(ctx, 100, 100, 120, 60, true, 1)).not.toThrow();
      expect(() =>
        drawGlassRod(ctx, 100, 100, 120, 60, false, 1)
      ).not.toThrow();
    });

    it('draws silk without throwing', () => {
      const { ctx } = makeCtx();
      expect(() => drawSilk(ctx, 250, 100, 120, 60, true, 1)).not.toThrow();
      expect(() => drawSilk(ctx, 250, 100, 120, 60, false, 1)).not.toThrow();
    });

    it('draws conductor without throwing', () => {
      const { ctx } = makeCtx();
      expect(() => drawConductor(ctx, 200, 200, 40, true, 1)).not.toThrow();
      expect(() => drawConductor(ctx, 200, 200, 40, false, 1)).not.toThrow();
    });

    it('draws ground symbol without throwing', () => {
      const { ctx } = makeCtx();
      expect(() => drawGround(ctx, 200, 300, 30, true)).not.toThrow();
      expect(() => drawGround(ctx, 200, 300, 30, false)).not.toThrow();
    });

    it('draws charged sphere without throwing', () => {
      const { ctx } = makeCtx();
      expect(() =>
        drawChargedSphere(ctx, 200, 200, 35, 2, true, 1)
      ).not.toThrow();
      expect(() =>
        drawChargedSphere(ctx, 200, 200, 35, -3, false, 1)
      ).not.toThrow();
      expect(() =>
        drawChargedSphere(ctx, 200, 200, 35, 0, true, 1)
      ).not.toThrow();
    });
  });

  describe('draw-charges', () => {
    it('draws net charges without throwing', () => {
      const { ctx } = makeCtx();
      expect(() => drawNetCharges(ctx, 200, 200, 2, 30, true, 1)).not.toThrow();
      expect(() =>
        drawNetCharges(ctx, 200, 200, -3, 30, true, 1)
      ).not.toThrow();
      expect(() => drawNetCharges(ctx, 200, 200, 0, 30, true, 1)).not.toThrow();
    });

    it('draws atom charges without throwing', () => {
      const { ctx } = makeCtx();
      expect(() =>
        drawAtomCharges(ctx, 100, 100, 120, 60, 0, true, 1)
      ).not.toThrow();
      expect(() =>
        drawAtomCharges(ctx, 100, 100, 120, 60, 2, false, 1)
      ).not.toThrow();
    });

    it('draws transfer arrow without throwing', () => {
      const { ctx } = makeCtx();
      expect(() =>
        drawTransferArrow(ctx, 100, 200, 300, 200, true, 1)
      ).not.toThrow();
    });
  });

  describe('draw-field-lines', () => {
    it('draws field lines from point without throwing', () => {
      const { ctx } = makeCtx();
      expect(() =>
        drawFieldLinesFromPoint(ctx, 200, 200, 2, 60, true, 1)
      ).not.toThrow();
      expect(() =>
        drawFieldLinesFromPoint(ctx, 200, 200, -3, 60, true, 1)
      ).not.toThrow();
      expect(() =>
        drawFieldLinesFromPoint(ctx, 200, 200, 0, 60, true, 1)
      ).not.toThrow();
    });

    it('draws field lines between opposite charges without throwing', () => {
      const { ctx } = makeCtx();
      expect(() =>
        drawFieldLinesBetween(ctx, 100, 200, 2, 300, 200, -2, true, 1)
      ).not.toThrow();
    });

    it('skips same-sign charges', () => {
      const { ctx } = makeCtx();
      expect(() =>
        drawFieldLinesBetween(ctx, 100, 200, 2, 300, 200, 2, true, 1)
      ).not.toThrow();
    });
  });

  describe('draw-step-indicator', () => {
    it('draws step indicator without throwing', () => {
      const { ctx } = makeCtx();
      expect(() =>
        drawStepIndicator(
          ctx,
          800,
          600,
          1,
          3,
          ['初始', '摩擦', '分离'],
          true,
          1
        )
      ).not.toThrow();
    });
  });

  describe('scene renderers', () => {
    it('draws friction scene step 0 without throwing', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot('friction', 0, 0, 0);
      expect(() =>
        drawFriction(
          { ctx, width: 800, height: 600, theme: 'dark', responsiveScale: 1 },
          snapshot
        )
      ).not.toThrow();
    });

    it('draws friction scene step 1 without throwing', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot('friction', 1, -2, 2);
      expect(() =>
        drawFriction(
          { ctx, width: 800, height: 600, theme: 'light', responsiveScale: 1 },
          snapshot
        )
      ).not.toThrow();
    });

    it('draws induction scene without throwing', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot('induction', 0, -2, 2);
      expect(() =>
        drawInduction(
          { ctx, width: 800, height: 600, theme: 'dark', responsiveScale: 1 },
          snapshot
        )
      ).not.toThrow();
    });

    it('draws contact scene without throwing', () => {
      const { ctx } = makeCtx();
      const snapshot = createSnapshot('contact', 0, 3, -1);
      expect(() =>
        drawContact(
          { ctx, width: 800, height: 600, theme: 'light', responsiveScale: 1 },
          snapshot
        )
      ).not.toThrow();
    });
  });
});
