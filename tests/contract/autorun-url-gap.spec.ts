/**
 * B13 / B22 冻结：顶层 readSceneParams 已清零；静态 autoPlay + autoRun
 * 未走 shouldAutoPlay 的场景只许缩小。
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SCENES_DIR = resolve(process.cwd(), 'src/scenes');

const MIGRATED_SHOULD_AUTO_PLAY = [
  'block-board',
  'charged-particle-circle',
  'emf-internal-resistance',
  'internal-energy',
  'mechanical-energy',
  'oscilloscope',
  'precision-tools',
  'projectile-components',
  'resistor-measurement',
  'rod-model',
  'single-loop',
  'spring-ball',
  'ticker-timer',
  'variable-work'
] as const;

const STATIC_AUTOPLAY_AUTORUN_GAP = [
  'accel-force',
  'air-track-momentum',
  'alternating-electric-deflection',
  'alternating-electric-field',
  'auto-water-feeder',
  'bellows',
  'binary-stars',
  'binding-energy',
  'bounded-magnetic',
  'brownian-motion',
  'capacitor-charge-discharge',
  'car-bank',
  'centripetal-motion',
  'charged-particle-electric',
  'charged-superposition',
  'closed-circuit',
  'closed-power',
  'conical-pendulum',
  'connected-bodies-incline',
  'cyclotron',
  'displacement-time',
  'earth-gravity',
  'electric-deflection',
  'electric-field-establish',
  'electrostatic-induction',
  'electrostatic-shielding',
  'free-fall-throw',
  'friction-critical',
  'galileo-incline',
  'half-deflection',
  'incline-spring',
  'induction-accelerator',
  'joule-work-heat',
  'laser-speed',
  'lenz-law',
  'lightbulb-iv-curve',
  'locomotive-power',
  'magnetic-convergence',
  'magnetic-mirror',
  'mass-spectrometer',
  'maxwell-speed-distribution',
  'mechanical-energy-two-ball',
  'metal-rod-track',
  'micro-deformation',
  'molecular-potential',
  'momentum-conservation-comparison',
  'momentum-ring-pendulum',
  'multimeter-practice',
  'orbit-critical',
  'parallel-glass-refraction',
  'pendulum-energy',
  'pendulum-period',
  'photoelectric-cutoff',
  'photoelectric-iv',
  'photoelectric-switch',
  'radioactive-decay',
  'rutherford-alpha-scattering',
  'satellite-transfer',
  'semicylinder-tir',
  'semicylinder-tir-standard',
  'three-forces',
  'uniform-electric-acceleration',
  'uniformly-varied-motion',
  'velocity-selector',
  'vertical-circle',
  'wave-superpose',
  'wedge-film-interference',
  'wire-loop-field',
  'zinc-photoelectric-energy'
] as const;

const STATIC_AUTOPLAY_AUTORUN_GAP_CEILING = 69;

function listSceneIds(): string[] {
  return readdirSync(SCENES_DIR)
    .filter(
      (name) =>
        statSync(join(SCENES_DIR, name)).isDirectory() &&
        existsSync(join(SCENES_DIR, name, 'page.ts'))
    )
    .sort();
}

function hasTopLevelReadSceneParams(source: string): boolean {
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (/^const\s+\w+\s*=\s*readSceneParams\s*\(/.test(trimmed)) return true;
    if (/^const\s+\{[^}]+\}\s*=\s*readSceneParams\s*\(/.test(trimmed)) {
      return true;
    }
  }
  return false;
}

describe('autoRun URL gap freeze (B13/B22)', () => {
  const sceneIds = listSceneIds();

  it('B13 remaining top-level readSceneParams is 0', () => {
    const leftover: string[] = [];
    for (const id of sceneIds) {
      const page = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      if (hasTopLevelReadSceneParams(page)) leftover.push(id);
    }
    expect(leftover).toEqual([]);
  });

  it('I3 migrated 14 scenes keep shouldAutoPlay', () => {
    for (const id of MIGRATED_SHOULD_AUTO_PLAY) {
      const page = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      expect(page, `${id} lost shouldAutoPlay`).toMatch(/\bshouldAutoPlay\s*:/);
    }
  });

  it('B22 static autoPlay+autoRun gap may only shrink', () => {
    const gap: string[] = [];
    for (const id of sceneIds) {
      const page = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      const meta = readFileSync(join(SCENES_DIR, id, 'scene.meta.ts'), 'utf8');
      const hasAutoPlay = /autoPlay\s*:\s*true/.test(page);
      const hasAutoRun = /\bautoRun\b/.test(meta);
      const hasHook = /\bshouldAutoPlay\s*:/.test(page);
      if (hasAutoPlay && hasAutoRun && !hasHook) gap.push(id);
    }
    expect(STATIC_AUTOPLAY_AUTORUN_GAP.length).toBeLessThanOrEqual(
      STATIC_AUTOPLAY_AUTORUN_GAP_CEILING
    );
    const frozen = new Set<string>(STATIC_AUTOPLAY_AUTORUN_GAP);
    const extra = gap.filter((id) => !frozen.has(id));
    const stale = STATIC_AUTOPLAY_AUTORUN_GAP.filter((id) => !gap.includes(id));
    expect(
      extra,
      `B22 新缺口必须先迁 shouldAutoPlay，禁止扩大清单：${extra.join(', ')}`
    ).toEqual([]);
    expect(
      stale,
      `B22 清单陈旧（场景已有 shouldAutoPlay，从清单删除）：${stale.join(', ')}`
    ).toEqual([]);
  });
});
