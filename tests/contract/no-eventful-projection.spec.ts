/**
 * NO_EVENTFUL_PROJECTION 棘轮
 *
 * handle 暴露 setValue 就必须同时暴露 setValueSilently 与 fieldTypes
 *（或经 exposeSchemaHandle / return renderer / §1.2(c) 既有形态）。
 * grandfather = 尚未迁移的 83 薄包装 + 28 带副作用；A4 机械批只许从中删除不许新增。
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const SCENES_DIR = resolve(ROOT, 'src/scenes');
const PAGES_DIR = resolve(ROOT, 'src/pages');

/**
 * §1.2(c) 9 个既有形态：return renderer / 委托工厂 / 六件套 / double-slit /
 * electrification。本阶段不改 page.ts，允许暂无 fieldTypes 字面量。
 */
const EXISTING_SPECIAL_HANDLE_FORMS = new Set([
  'doppler-effect',
  'double-slit',
  'electrification',
  'mechanical-wave',
  'micrometer',
  'projectile',
  'single-loop',
  'spring-oscillator',
  'vernier-caliper'
]);

/** src/pages 六件套（fieldTypes 随后续补齐） */
const PAGES_SPECIAL_FORMS = new Set(['src/pages/single-loop-integration.ts']);

/** dispose-only 待迁移（§1.2(a) 子集） */
const DISPOSE_ONLY_PENDING = ['chase-meet', 'emf-analogy'] as const;

/**
 * 尚未迁移的 83 薄包装 + 28 带副作用（§1.2(b) 含 vt-integral 编码场景，已在 A3 收口）。
 * A4 只许删除；新增场景必须 silent-ready，禁止写入本清单。
 */
const EVENTFUL_PROJECTION_GRANDFATHER = [
  'accel-force',
  'air-track-momentum',
  'alternating-electric-deflection',
  'alternating-electric-field',
  'ampere-balance',
  'auto-water-feeder',
  'bellows',
  'binary-stars',
  'binding-energy',
  'block-board',
  'bounded-magnetic',
  'brownian-motion',
  'bullet-block',
  'capacitor-charge-discharge',
  'car-bank',
  'charged-particle-electric',
  'charged-superposition',
  'chase-meet',
  'closed-circuit',
  'closed-power',
  'clothes-rod',
  'conical-pendulum',
  'connected-bodies',
  'connected-bodies-incline',
  'conveyor-belt',
  'cyclotron',
  'displacement-time',
  'earth-gravity',
  'elastic-collision',
  'elastic-energy',
  'electric-deflection',
  'electric-field-establish',
  'electric-pendulum',
  'electrostatic-induction',
  'electrostatic-shielding',
  'emf-analogy',
  'faraday-disc',
  'field-lines',
  'free-fall-throw',
  'friction-critical',
  'galileo-incline',
  'half-deflection',
  'harmonic-wave',
  'impulse-momentum',
  'incline-spring',
  'induction-accelerator',
  'interference-formula',
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
  'oscilloscope',
  'parallel-capacitor',
  'parallel-glass-refraction',
  'parallelogram-rule',
  'pendulum-energy',
  'pendulum-period',
  'photoelectric-cutoff',
  'photoelectric-iv',
  'photoelectric-switch',
  'potential-energy-graphs',
  'projectile-data-analysis',
  'radioactive-decay',
  'rod-model',
  'rutherford-alpha-scattering',
  'satellite-transfer',
  'semicylinder-tir',
  'semicylinder-tir-standard',
  'single-slit',
  'thin-film',
  'ticker-timer',
  'tortoise-hare',
  'uniform-electric-acceleration',
  'uniformly-varied-motion',
  'velocity-selector',
  'vertical-circle',
  'wave-superpose',
  'wedge',
  'wedge-film-interference',
  'wire-loop-field',
  'xt-graph',
  'zinc-photoelectric-energy'
] as const;

const GRANDFATHER_SET = new Set<string>(EVENTFUL_PROJECTION_GRANDFATHER);
const GRANDFATHER_CEILING = 111;

const HANDLE_KEY =
  /^(setValueSilently|setActiveSilently|setValue|setActive|setVisible|fieldTypes|syncFromScene|refresh|dispose)\b\s*[:(\s,]/;

function listSceneIds(): string[] {
  return readdirSync(SCENES_DIR)
    .filter((name) => statSync(join(SCENES_DIR, name)).isDirectory())
    .filter((name) => {
      try {
        return statSync(join(SCENES_DIR, name, 'page.ts')).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

function listPageTsFiles(): string[] {
  return readdirSync(PAGES_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(PAGES_DIR, name))
    .sort();
}

function collectHandleKeys(source: string): Set<string> {
  const keys = new Set<string>();
  for (const line of source.split('\n')) {
    const match = line.trim().match(HANDLE_KEY);
    if (match) keys.add(match[1]);
  }
  return keys;
}

function isSilentReady(source: string): boolean {
  if (/\bexposeSchemaHandle\s*\(/.test(source)) return true;
  if (/\breturn\s+renderer\s*;/.test(source)) return true;
  const keys = collectHandleKeys(source);
  return (
    keys.has('setValue') &&
    keys.has('setValueSilently') &&
    keys.has('fieldTypes')
  );
}

function isDisposeOnly(source: string): boolean {
  const keys = collectHandleKeys(source);
  return keys.has('dispose') && !keys.has('setValue') && !keys.has('setActive');
}

describe('NO_EVENTFUL_PROJECTION', () => {
  const sceneIds = listSceneIds();

  it('grandfather is a frozen ceiling over unmigrated scenes (A4 may only shrink)', () => {
    expect(EVENTFUL_PROJECTION_GRANDFATHER.length).toBeLessThanOrEqual(
      GRANDFATHER_CEILING
    );
    expect(GRANDFATHER_SET.size).toBe(EVENTFUL_PROJECTION_GRANDFATHER.length);
    const unknown = EVENTFUL_PROJECTION_GRANDFATHER.filter(
      (id) => !sceneIds.includes(id)
    );
    expect(unknown).toEqual([]);
    const overlap = EVENTFUL_PROJECTION_GRANDFATHER.filter((id) =>
      EXISTING_SPECIAL_HANDLE_FORMS.has(id)
    );
    expect(overlap).toEqual([]);
  });

  it('dispose-only pending scenes stay grandfathered and expose no setValue', () => {
    for (const id of DISPOSE_ONLY_PENDING) {
      expect(GRANDFATHER_SET.has(id)).toBe(true);
      const source = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      expect(isDisposeOnly(source)).toBe(true);
    }
  });

  it('every scene page is grandfather, special-form, or silent-ready with fieldTypes', () => {
    const unclassified: string[] = [];
    const staleGrandfather: string[] = [];
    for (const id of sceneIds) {
      const source = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      const silentReady = isSilentReady(source);
      const grandfathered = GRANDFATHER_SET.has(id);
      const special = EXISTING_SPECIAL_HANDLE_FORMS.has(id);
      if (silentReady && grandfathered) {
        staleGrandfather.push(id);
        continue;
      }
      if (silentReady || grandfathered || special) continue;
      unclassified.push(id);
    }
    expect(staleGrandfather).toEqual([]);
    expect(unclassified).toEqual([]);
  });

  it('new scenes must not join the grandfather list', () => {
    const missingFromPartition = sceneIds.filter(
      (id) => !GRANDFATHER_SET.has(id) && !EXISTING_SPECIAL_HANDLE_FORMS.has(id)
    );
    for (const id of missingFromPartition) {
      const source = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      expect(
        isSilentReady(source),
        `${id}: use exposeSchemaHandle / return renderer / setValue+setValueSilently+fieldTypes; do not add to EVENTFUL_PROJECTION_GRANDFATHER`
      ).toBe(true);
    }
  });

  it('src/pages/*.ts handles expose silent setters and fieldTypes, or are listed', () => {
    const stalePages: string[] = [];
    const unclassified: string[] = [];
    for (const file of listPageTsFiles()) {
      const rel = relative(ROOT, file).replaceAll('\\', '/');
      const source = readFileSync(file, 'utf8');
      const silentReady = isSilentReady(source);
      const special = PAGES_SPECIAL_FORMS.has(rel);
      if (silentReady && special) {
        stalePages.push(rel);
        continue;
      }
      if (silentReady || special) continue;
      const keys = collectHandleKeys(source);
      if (!keys.has('setValue') && !/\bexposeSchemaHandle\s*\(/.test(source)) {
        continue;
      }
      unclassified.push(rel);
    }
    expect(stalePages).toEqual([]);
    expect(unclassified).toEqual([]);
  });

  it('exposeSchemaHandle transcludes fieldTypes by reference', () => {
    const source = readFileSync(
      resolve(ROOT, 'src/ui/components/expose-schema-handle.ts'),
      'utf8'
    );
    expect(source).toMatch(/fieldTypes:\s*renderer\.fieldTypes/);
    expect(source).not.toMatch(/new Map\s*\(\s*renderer\.fieldTypes/);
  });
});
