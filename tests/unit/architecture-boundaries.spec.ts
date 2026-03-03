import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('architecture boundaries', () => {
  it('scene.sim modules do not import app or ui layer', () => {
    const simSource = readSource('src/scenes/projectile/scene.sim.ts');
    expect(simSource.includes('../app/')).toBe(false);
    expect(simSource.includes('../../app/')).toBe(false);
    expect(simSource.includes('../ui/')).toBe(false);
    expect(simSource.includes('../../ui/')).toBe(false);
  });

  it('core modules do not import app layer', () => {
    const coreFiles = [
      'src/core/fixed-step.ts',
      'src/core/rng.ts',
      'src/core/guards.ts',
      'src/core/high-dpi-canvas.ts'
    ];

    for (const file of coreFiles) {
      const source = readSource(file);
      expect(source.includes('../app/')).toBe(false);
      expect(source.includes('../../app/')).toBe(false);
    }
  });
});
