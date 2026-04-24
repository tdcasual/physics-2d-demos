import { describe, it, expect } from 'vitest';
import {
  buildCoordSystem,
  worldToScreen,
  computeWorldBounds,
} from '../../src/scenes/projectile/renderer/coords';
import { drawAxes } from '../../src/scenes/projectile/renderer/draw-axes';
import { drawBackground } from '../../src/scenes/projectile/renderer/draw-background';
import { drawProjectile } from '../../src/scenes/projectile/renderer/draw-projectile';
import { drawTrajectory } from '../../src/scenes/projectile/renderer/draw-trajectory';

import type { CoordSystem, WorldPoint } from '../../src/scenes/projectile/renderer/types';
import type { ProjectileState } from '../../src/scenes/projectile/scene.sim';

function makeCtx(): { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return { ctx: canvas.getContext('2d')!, canvas };
}

function makeDrawContext() {
  const { ctx } = makeCtx();
  return { ctx, width: 800, height: 600, theme: 'dark' as const, responsiveScale: 1 };
}

describe('projectile renderer', () => {
  describe('coords', () => {
    it('builds coord system without throwing', () => {
      expect(() => buildCoordSystem(800, 600, 1, 100, 50)).not.toThrow();
    });

    it('returns correct coord system values', () => {
      const coords = buildCoordSystem(800, 600, 1, 100, 50);
      expect(coords).toHaveProperty('originX');
      expect(coords).toHaveProperty('originY');
      expect(coords).toHaveProperty('scale');
      expect(coords.scale).toBeGreaterThan(0);
    });

    it('converts world to screen without throwing', () => {
      const coords: CoordSystem = { originX: 60, originY: 550, scale: 5 };
      const world: WorldPoint = { x: 10, y: 20 };
      expect(() => worldToScreen(world, coords)).not.toThrow();
    });

    it('returns correct screen coordinates', () => {
      const coords: CoordSystem = { originX: 60, originY: 550, scale: 5 };
      const world: WorldPoint = { x: 10, y: 20 };
      const screen = worldToScreen(world, coords);
      expect(screen.x).toBe(60 + 10 * 5);
      expect(screen.y).toBe(550 - 20 * 5);
    });

    it('computes world bounds without throwing', () => {
      const state: ProjectileState = { x: 80, y: 40, vx: 10, vy: 5, t: 1 };
      const trail: WorldPoint[] = [
        { x: 10, y: 20 },
        { x: 30, y: 35 },
      ];
      expect(() => computeWorldBounds(state, trail)).not.toThrow();
    });

    it('returns correct world bounds', () => {
      const state: ProjectileState = { x: 80, y: 40, vx: 10, vy: 5, t: 1 };
      const trail: WorldPoint[] = [
        { x: 10, y: 20 },
        { x: 30, y: 35 },
      ];
      const bounds = computeWorldBounds(state, trail);
      expect(bounds.maxX).toBe(80);
      expect(bounds.maxY).toBe(40);
    });
  });

  describe('draw-axes', () => {
    it('draws axes without throwing', () => {
      const context = makeDrawContext();
      expect(() => drawAxes(context, 60, 550)).not.toThrow();
    });
  });

  describe('draw-background', () => {
    it('draws background without throwing', () => {
      const context = makeDrawContext();
      expect(() => drawBackground(context, 60, 550)).not.toThrow();
    });
  });

  describe('draw-projectile', () => {
    it('draws projectile without throwing', () => {
      const context = makeDrawContext();
      const position: WorldPoint = { x: 10, y: 20 };
      const coords: CoordSystem = { originX: 60, originY: 550, scale: 5 };
      expect(() => drawProjectile(context, position, coords)).not.toThrow();
    });
  });

  describe('draw-trajectory', () => {
    it('draws trajectory without throwing', () => {
      const context = makeDrawContext();
      const trail: WorldPoint[] = [
        { x: 0, y: 0 },
        { x: 5, y: 10 },
        { x: 10, y: 15 },
      ];
      const coords: CoordSystem = { originX: 60, originY: 550, scale: 5 };
      expect(() => drawTrajectory(context, trail, coords)).not.toThrow();
    });

    it('returns early when trail has fewer than 2 points', () => {
      const context = makeDrawContext();
      const trail: WorldPoint[] = [{ x: 0, y: 0 }];
      const coords: CoordSystem = { originX: 60, originY: 550, scale: 5 };
      expect(() => drawTrajectory(context, trail, coords)).not.toThrow();
    });
  });
});
