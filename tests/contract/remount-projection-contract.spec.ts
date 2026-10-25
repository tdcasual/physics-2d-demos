/**
 * remount 投影契约（运行时）
 *
 * 对每个 page.ts：用真实 createScene / createControls 挂起控制面板，在场景上
 * 改动 slider 对应的参数，再走平台 remount / reset 路径
 * （syncControlsFromLiveParams）。断言：
 * - 控件显示 live 值（按 schema bind 换算）
 * - 投影静默：不派发 input/change、不调用 setParams、不写回 URL
 *
 * 取代按源码正则推断「句柄是否可投影」的旧契约。少数形态特殊的页面
 * 在 SKIP 登记理由。
 */
import { describe, expect, it, vi } from 'vitest';
import type {
  ScenePageOptions,
  SceneInstance
} from '../../src/app/scene-bootstrapper-types';
import { syncControlsFromLiveParams } from '../../src/app/control-projection';
import type { ControlsSchema } from '../../src/platform/controls-schema';
import {
  collectBindings,
  controlToParam,
  paramKeyOf,
  paramToControl
} from '../../src/platform/param-binding';

const captured = vi.hoisted(() => ({
  current: null as unknown,
  byPath: new Map<string, unknown>()
}));

vi.mock('../../src/app/scene-bootstrapper', () => ({
  bootScenePage: (options: unknown) => {
    captured.current = options;
  }
}));

const SKIP: Record<string, string> = {
  'spring-oscillator':
    'imperative controls.ts：振子卡片列表由 syncFromScene 重建，参数不在 schema slider 上',
  'single-loop':
    '委托 src/pages/single-loop-integration.ts 工厂，控件非 schema 渲染',
  'double-slit':
    '按 step 切换 schema，滑块与参数随步骤变化；投影由 syncFromScene 按步骤处理（见 double-slit 专项测试）',
  'emf-analogy':
    'defaultParams 为空，无可投影参数（NO_CONTROL_PROJECTION 同理由）'
};

const pageLoaders = import.meta.glob('../../src/scenes/*/page.ts');
const schemaModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/controls-schema.ts',
  { eager: true }
);

function schemasOf(id: string): ControlsSchema[] {
  const mod = schemaModules[`../../src/scenes/${id}/controls-schema.ts`];
  return Object.values(mod ?? {}).filter(
    (value): value is ControlsSchema =>
      !!value && typeof value === 'object' && 'sections' in value
  );
}

const ids = Object.keys(pageLoaders)
  .map((path) => path.split('/').slice(-2, -1)[0])
  .filter((id) => !(id in SKIP))
  .sort();

describe('remount projection contract', () => {
  it('SKIP entries are known scenes', () => {
    const all = Object.keys(pageLoaders).map(
      (path) => path.split('/').slice(-2, -1)[0]
    );
    for (const id of Object.keys(SKIP)) expect(all, id).toContain(id);
  });

  it.each(ids)('%s: sliders follow live params silently', async (id) => {
    captured.current = null;
    await pageLoaders[`../../src/scenes/${id}/page.ts`]();
    const options = captured.current as ScenePageOptions<SceneInstance> | null;
    expect(options, `${id}: page did not call bootScenePage`).toBeTruthy();
    if (!options?.createControls) return;

    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    container.appendChild(canvas);
    const graph = document.createElement('div');
    document.body.append(container, graph);
    const scene = options.createScene({
      canvas,
      container,
      slots: { animation: container, control: container, graph },
      theme: 'light',
      mode: 'normal',
      urlParams: {}
    } as never);
    scene.init?.();

    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const writeParam = vi.fn();
    const handle = options.createControls({
      mount,
      scene,
      scheduleRender: () => {},
      writeParam,
      urlParams: {}
    } as never) as unknown as Record<string, unknown>;

    try {
      const api = scene as unknown as {
        setParams?: (p: Record<string, unknown>) => unknown;
        getParams?: () => Record<string, unknown>;
      };
      if (!api.setParams || !api.getParams) return;

      // 选 schema 里每个 slider：改到 min（或 max，若默认即 min）
      const expectations: Array<{ key: string }> = [];
      for (const schema of schemasOf(id)) {
        const bindings = collectBindings(schema);
        for (const section of schema.sections) {
          for (const field of section.fields) {
            if (field.type !== 'slider') continue;
            const input = mount.querySelector<HTMLInputElement>(
              `[data-control-key="${field.key}"] input[type=range]`
            );
            if (!input) continue;
            const paramKey = paramKeyOf(field.key, bindings);
            if (!(paramKey in api.getParams())) continue;
            const target =
              Math.abs(Number(input.value) - field.min) < 1e-9
                ? field.max
                : field.min;
            api.setParams({
              [paramKey]: controlToParam(field.key, target, bindings)
            });
            expectations.push({ key: field.key });
          }
        }
      }
      // toggle 与预设 / 场景选择：切到另一个值
      const choiceExpectations: Array<{
        key: string;
        kind: 'toggle' | 'radio';
        ids: string[];
      }> = [];
      for (const schema of schemasOf(id)) {
        const bindings = collectBindings(schema);
        for (const section of schema.sections) {
          for (const field of section.fields) {
            const paramKey = paramKeyOf(field.key, bindings);
            if (!(paramKey in api.getParams())) continue;
            const root = mount.querySelector(
              `[data-control-key="${field.key}"]`
            );
            if (!root) continue;
            if (field.type === 'toggle') {
              const sw = root.querySelector('button[role="switch"]');
              if (!sw) continue;
              const next = sw.getAttribute('aria-checked') !== 'true';
              api.setParams({
                [paramKey]: controlToParam(field.key, next, bindings)
              });
              choiceExpectations.push({
                key: field.key,
                kind: 'toggle',
                ids: []
              });
            } else if (
              field.type === 'preset-group' ||
              field.type === 'scene-selector'
            ) {
              const ids =
                field.type === 'preset-group'
                  ? field.presets.map((p) => p.id)
                  : field.scenes.map((sc) => sc.id);
              const radios = [
                ...root.querySelectorAll<HTMLElement>('[role="radio"]')
              ];
              if (radios.length !== ids.length || ids.length < 2) continue;
              const current = radios.findIndex(
                (r) => r.getAttribute('aria-checked') === 'true'
              );
              const index = current === 0 ? 1 : 0;
              api.setParams({
                [paramKey]: controlToParam(field.key, ids[index], bindings)
              });
              choiceExpectations.push({ key: field.key, kind: 'radio', ids });
            }
          }
        }
      }
      if (expectations.length === 0 && choiceExpectations.length === 0) {
        return;
      }

      const events: string[] = [];
      mount.addEventListener('input', () => events.push('input'), true);
      mount.addEventListener('change', () => events.push('change'), true);
      const setParamsSpy = vi.spyOn(api, 'setParams');

      syncControlsFromLiveParams({
        params: api.getParams(),
        handle,
        paramSync: options.paramSync
      });

      // 断言针对**最终** live 值：一些参数会联动（如切预设重置高度），
      // 所以按投影时的 getParams 解码期望值，而不是按当初设的目标值。
      const live = api.getParams();
      const bindingsByKey = new Map(
        schemasOf(id).flatMap((schema) => [...collectBindings(schema)])
      );
      const liveControl = (key: string): unknown =>
        paramToControl(
          key,
          live[paramKeyOf(key, bindingsByKey)],
          bindingsByKey
        );
      const mismatched = expectations.filter(({ key }) => {
        const input = mount.querySelector<HTMLInputElement>(
          `[data-control-key="${key}"] input[type=range]`
        );
        return Math.abs(Number(input?.value) - Number(liveControl(key))) > 1e-6;
      });
      const choiceMismatched = choiceExpectations.filter((e) => {
        const root = mount.querySelector(`[data-control-key="${e.key}"]`);
        if (e.kind === 'toggle') {
          return (
            root
              ?.querySelector('button[role="switch"]')
              ?.getAttribute('aria-checked') !==
            String(Boolean(liveControl(e.key)))
          );
        }
        const radios = [...(root?.querySelectorAll('[role="radio"]') ?? [])];
        const checked = radios.findIndex(
          (r) => r.getAttribute('aria-checked') === 'true'
        );
        return checked !== e.ids.indexOf(String(liveControl(e.key)));
      });
      expect(
        [...mismatched, ...choiceMismatched].map((m) => m.key),
        `${id}: remount 后控件未显示 live 值`
      ).toEqual([]);
      expect(events, `${id}: 投影不得派发事件`).toEqual([]);
      expect(setParamsSpy, `${id}: 投影不得写场景`).not.toHaveBeenCalled();
      expect(writeParam, `${id}: 投影不得写 URL`).not.toHaveBeenCalled();
    } finally {
      (handle as { dispose?: () => void } | null)?.dispose?.();
      (scene as { dispose?: () => void }).dispose?.();
      mount.remove();
      container.remove();
      graph.remove();
    }
  });
});
