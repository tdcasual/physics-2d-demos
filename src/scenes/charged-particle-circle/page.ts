import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';

import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { chargedParticleControlsSchema } from './controls-schema';
import { asFieldDirection, createChargedParticleScene } from './scene.entry';
import { chargedParticleMeta } from './scene.meta';
import {
  asBool,
  type ChargedParticleParams,
  type FieldDirection
} from './scene.sim';

const NUMBER_KEYS = ['mass', 'charge', 'velocity', 'magneticField'] as const;
const FLAG_KEYS = ['autoRun', 'showVelocity', 'showForce'] as const;

function rawQuery(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

function paramsFromUrl(
  raw: Record<string, number | string>
): Partial<ChargedParticleParams> {
  const next: Partial<ChargedParticleParams> = {};
  for (const key of NUMBER_KEYS) {
    if (raw[key] === undefined) continue;
    const number = Number(raw[key]);
    if (Number.isFinite(number)) next[key] = number;
  }
  for (const key of FLAG_KEYS) {
    const parsed = raw[key];
    const source =
      parsed !== undefined &&
      !(typeof parsed === 'number' && Number.isNaN(parsed))
        ? parsed
        : rawQuery(key);
    if (source === undefined || source === null) continue;
    next[key] = asBool(source, key !== 'autoRun' ? true : false);
  }
  const fieldSource =
    raw.fieldDirection !== undefined &&
    !(
      typeof raw.fieldDirection === 'number' && Number.isNaN(raw.fieldDirection)
    )
      ? raw.fieldDirection
      : rawQuery('fieldDirection');
  const direction = asFieldDirection(fieldSource);
  if (direction) next.fieldDirection = direction;
  return next;
}

function syncControls(
  renderer: ReturnType<typeof renderSchema>,
  params: ChargedParticleParams
): void {
  renderer.setValueSilently('mass', params.mass);
  renderer.setValueSilently('charge', params.charge);
  renderer.setValueSilently('velocity', params.velocity);
  renderer.setValueSilently('magneticField', params.magneticField);
  renderer.setValueSilently('autoRun', params.autoRun);
  renderer.setValueSilently('showVelocity', params.showVelocity);
  renderer.setValueSilently('showForce', params.showForce);
  renderer.setActiveSilently('fieldDirection', params.fieldDirection);
}

bootScenePage({
  meta: chargedParticleMeta,
  shouldAutoPlay: (_params, urlParams) =>
    paramsFromUrl(urlParams).autoRun !== false,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints, urlParams }) => {
    if (!canvas) throw new Error('charged-particle-circle requires a canvas');
    const scene = createChargedParticleScene({
      canvas,
      theme,
      mode,
      demoHints,
      initialParams: paramsFromUrl(urlParams ?? {})
    });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const particleScene = scene as ReturnType<
      typeof createChargedParticleScene
    >;

    const renderer = renderSchema({
      mount,
      schema: chargedParticleControlsSchema,
      onChange: (key, value) => {
        if (key === 'fieldDirection') {
          const direction: FieldDirection = asFieldDirection(value) ?? 'into';
          particleScene.setParams({ fieldDirection: direction });
          renderer.setActive('fieldDirection', direction);
          writeParam?.(key, direction === 'out' ? 1 : 0);
        } else if ((FLAG_KEYS as readonly string[]).includes(key)) {
          const on = asBool(value, false);
          particleScene.setParams({
            [key]: on
          } as Partial<ChargedParticleParams>);
          renderer.setValue(key, on);
          writeParam?.(key, on ? 1 : 0);
        } else if ((NUMBER_KEYS as readonly string[]).includes(key)) {
          const applied = particleScene.setParams({
            [key]: Number(value)
          } as Partial<ChargedParticleParams>);
          renderer.setValue(key, applied[key as (typeof NUMBER_KEYS)[number]]);
          writeParam?.(key, applied[key as (typeof NUMBER_KEYS)[number]]);
        }
        render();
      },
      onAction: () => {}
    });

    const originalReset = particleScene.reset.bind(particleScene);
    particleScene.reset = () => {
      originalReset();
      syncControls(renderer, particleScene.getParams());
    };

    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene: () => syncControls(renderer, particleScene.getParams())
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'fieldDirection') {
        const source =
          typeof value === 'number' && Number.isNaN(value)
            ? rawQuery('fieldDirection')
            : value;
        const direction = asFieldDirection(source) ?? 'into';
        ctx.scene.setParams({ fieldDirection: direction });
        ctx.setControlActive('fieldDirection', direction);
        return true;
      }
      if ((FLAG_KEYS as readonly string[]).includes(key)) {
        const source =
          typeof value === 'number' && Number.isNaN(value)
            ? rawQuery(key)
            : value;
        const on = asBool(source, false);
        ctx.scene.setParams({ [key]: on } as Partial<ChargedParticleParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if ((NUMBER_KEYS as readonly string[]).includes(key)) {
        const n = Number(value);
        if (Number.isFinite(n)) {
          const applied = ctx.scene.setParams({
            [key]: n
          } as Partial<ChargedParticleParams>);
          ctx.setControlValue(
            key,
            applied[key as (typeof NUMBER_KEYS)[number]]
          );
        }
        return true;
      }
      return false;
    }
  }
});
