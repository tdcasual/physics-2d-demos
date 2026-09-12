/**
 * 场景参数契约测试 — defaultParams ∪ urlSyncKeys 键回环校验
 *
 * 对每个场景实例化 entry，对 meta.defaultParams（及 urlSyncKeys）的每个键
 * 调 setParams({key}) 后断言 getParams() 包含对应键，保证：
 * - URL 同步键（readSceneParams 的 allowedKeys）都能真正落到 sim 上
 * - 控制面板的 key 不会静默失效
 *
 * meta 键与 sim 参数键不一致的场景（如 projectile 的 v0→speed），
 * 必须在 PARAM_KEY_MAP 显式登记映射；不经过 sim setParams 的键
 * （如 UI 状态键）必须在 NON_SIM_KEYS 登记豁免并注明理由。
 */

import { describe, expect, it } from 'vitest';
import type { SceneMeta } from '../../src/platform/scene-contract';
import type { ControlsSchema } from '../../src/platform/controls-schema';

// ---------------------------------------------------------------------------
// 键名映射：meta.defaultParams/urlSyncKeys 键 → sim setParams 键
// ---------------------------------------------------------------------------

const PARAM_KEY_MAP: Record<string, Record<string, string>> = {
  // page.ts 经 createParamMapper 做的同一份映射，这里显式登记以便机器校验
  projectile: {
    v0: 'speed',
    theta: 'angleDeg',
    h0: 'initialHeight',
    g: 'gravity',
    c: 'drag'
  }
};

// ---------------------------------------------------------------------------
// 豁免：不经过 sim setParams 的键（必须注明承载方式）
// ---------------------------------------------------------------------------

const NON_SIM_KEYS: Record<string, Record<string, string>> = {};

// 无对象式 setParams 的场景（entry 暴露专用 setter，须注明承载方式）
const NO_PARAMS_API: Record<string, string> = {
  // 水路类比：defaultParams 已清空；控件键 tap/speed 走 NON_PARAM_KEYS
  'emf-analogy':
    'entry exposes setSystemOn/setTapOpening/setView; no URL-shareable defaultParams',
  // entry 暴露 setParam(key, value) 单键设置；URL 管线会 fallback setParam
  'mechanical-wave': 'entry exposes setParam(key, value) instead of setParams'
};

// ---------------------------------------------------------------------------
// controls-schema 字段 key 契约的登记表
// ---------------------------------------------------------------------------

// 参与参数空间校验的字段类型（button/preset-group/transport 等为 action
// 或导航类字段，天然不走 sim setParams，不在本契约范围内）
const PARAM_FIELD_TYPES = new Set(['slider', 'number', 'select', 'toggle']);

// 豁免：合法但不在 defaultParams ∪ urlSyncKeys 中的字段 key（必须注明承载方式）
const NON_PARAM_KEYS: Record<string, Record<string, string>> = {
  'doppler-effect': {
    // page.ts: setParams({playbackSpeed})，为 sim 参数但未列入 meta
    playbackSpeed: 'sim param via setParams, not declared in meta',
    // page.ts: setParams + enableAudio/disableAudio 专用 API
    audioEnabled: 'sim param + enableAudio/disableAudio dedicated API',
    // page.ts: setParams + setVolume 专用 API（数值按 /100 换算）
    audioVolume: 'sim param + setVolume dedicated API'
  },
  'double-slit': {
    // page.ts: setParams({L: value / 100})，为 sim 参数但未列入 meta
    L: 'sim param via setParams (scaled /100), not declared in meta',
    // 仅步骤 6 schema 使用；page.ts: setParams({crosshairAngle})
    crosshairAngle: 'sim param via setParams (step-6 schema only)',
    // 仅步骤 6 schema 使用；page.ts: setParams({stripeOffset})
    stripeOffset: 'sim param via setParams (step-6 schema only)'
  },
  'emf-analogy': {
    // NO_PARAMS_API 场景；page.ts: setTapOpening 专用 API
    tap: 'setTapOpening dedicated API',
    // 播放速度 UI 状态，page.ts 仅更新状态栏与 URL
    speed: 'playback-speed UI state, status line only'
  },
  'mechanical-wave': {
    // NO_PARAMS_API 场景；page.ts: setParam('showMicroShift', 0|1)
    showMicroShift: 'sim param via setParam single-key API',
    // NO_PARAMS_API 场景；page.ts: setParam('playbackSpeed', v)
    playbackSpeed: 'sim param via setParam single-key API'
  },
  'thin-film': {
    // page.ts: setParams({whiteLight})，为 sim 参数但未列入 meta
    whiteLight: 'sim param via setParams, not declared in meta',
    // page.ts: setCursorY 专用 API（数值按 /100 换算）
    cursorY: 'setCursorY dedicated API (scaled /100)'
  },
  wedge: {
    // page.ts: setCursorX 专用 API（数值按 /100 换算）
    cursorX: 'setCursorX dedicated API (scaled /100)'
  }
};

// ---------------------------------------------------------------------------
// 动态发现 meta 与 entry
// ---------------------------------------------------------------------------

const metaModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/scene.meta.ts',
  { eager: true }
);

const entryModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/scene.entry.ts',
  { eager: true }
);

const schemaModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/controls-schema.ts',
  { eager: true }
);

function isControlsSchema(value: unknown): value is ControlsSchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { sections?: unknown }).sections)
  );
}

// 一个 controls-schema.ts 可能导出多份 schema（如 double-slit 按步骤切换）
const schemasById = new Map<string, ControlsSchema[]>();
for (const [path, mod] of Object.entries(schemaModules)) {
  const id = path.split('/').slice(-2, -1)[0];
  const schemas = Object.values(mod).filter(isControlsSchema);
  if (schemas.length > 0) schemasById.set(id, schemas);
}

type DiscoveredScene = {
  id: string;
  meta: SceneMeta;
  create: () => Record<string, unknown>;
};

function extractMeta(mod: Record<string, unknown>): SceneMeta {
  const key = Object.keys(mod).find((k) => k.endsWith('Meta'));
  if (!key) throw new Error('scene.meta.ts must export a *Meta object');
  return mod[key] as SceneMeta;
}

function extractCreate(
  mod: Record<string, unknown>
): (opts?: Record<string, unknown>) => Record<string, unknown> {
  const fn = Object.entries(mod).find(
    ([key, val]) =>
      key.startsWith('create') &&
      key.endsWith('Scene') &&
      typeof val === 'function'
  )?.[1];
  if (typeof fn !== 'function') {
    throw new Error('scene.entry.ts must export a create*Scene factory');
  }
  return fn as (opts?: Record<string, unknown>) => Record<string, unknown>;
}

const scenes: DiscoveredScene[] = Object.entries(metaModules).map(
  ([path, mod]) => {
    const id = path.split('/').slice(-2, -1)[0];
    const entry = entryModules[`../../src/scenes/${id}/scene.entry.ts`];
    if (!entry) throw new Error(`${id}: missing scene.entry.ts`);
    return {
      id,
      meta: extractMeta(mod),
      create: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        return extractCreate(entry)({ canvas });
      }
    };
  }
);

// ---------------------------------------------------------------------------
// 契约测试
// ---------------------------------------------------------------------------

describe('scene params contract', () => {
  it.each(scenes.map((s) => ({ id: s.id })))(
    '$id: every mapped/exempted key actually exists in meta keys',
    ({ id }) => {
      const meta = scenes.find((s) => s.id === id)!.meta;
      const keys = new Set([
        ...Object.keys(meta.defaultParams),
        ...(meta.urlSyncKeys ?? [])
      ]);
      for (const key of Object.keys(PARAM_KEY_MAP[id] ?? {})) {
        expect(
          keys.has(key),
          `${id}: PARAM_KEY_MAP 登记了 meta 中不存在的键 "${key}"`
        ).toBe(true);
      }
      for (const key of Object.keys(NON_SIM_KEYS[id] ?? {})) {
        expect(
          keys.has(key),
          `${id}: NON_SIM_KEYS 登记了 meta 中不存在的键 "${key}"`
        ).toBe(true);
      }
      // 防陈旧：登记了 NO_PARAMS_API 的场景必须确实没有 setParams
      if (id in NO_PARAMS_API) {
        const scene = scenes.find((s) => s.id === id)!.create();
        const maybe = scene as { setParams?: unknown; dispose?: () => void };
        expect(
          typeof maybe.setParams,
          `${id}: 已登记 NO_PARAMS_API 但 entry 已有 setParams，请移除登记并走默认回环校验`
        ).toBe('undefined');
        maybe.dispose?.();
      }
    }
  );

  it.each(scenes)(
    '$id: defaultParams ∪ urlSyncKeys keys round-trip through setParams/getParams',
    ({ id, meta, create }) => {
      const scene = create();
      const s = scene as {
        setParams?: (p: Record<string, unknown>) => unknown;
        getParams?: () => Record<string, unknown>;
        dispose?: () => void;
      };
      try {
        if (typeof s.setParams !== 'function') {
          expect(
            NO_PARAMS_API[id],
            `${id}: entry 无 setParams——若场景确无对象式参数 API，在 ` +
              'tests/contract/scene-params-contract.spec.ts 的 NO_PARAMS_API ' +
              '登记理由；否则在 src/scenes/' +
              `${id}/scene.entry.ts 中暴露 setParams/getParams`
          ).toBeTypeOf('string');
          return;
        }

        const keys = new Set([
          ...Object.keys(meta.defaultParams),
          ...(meta.urlSyncKeys ?? [])
        ]);
        const map = PARAM_KEY_MAP[id] ?? {};
        const exempt = NON_SIM_KEYS[id] ?? {};

        for (const key of keys) {
          if (key in exempt) continue;
          const simKey = map[key] ?? key;
          const value = meta.defaultParams[key] ?? 0;
          const returned = s.setParams({ [simKey]: value });
          // 优先读 getParams()；无 getParams 的场景用 setParams 的返回做回环
          const resolved =
            typeof s.getParams === 'function'
              ? s.getParams()
              : (returned as Record<string, unknown> | undefined);
          expect(
            resolved && typeof resolved === 'object'
              ? Object.keys(resolved)
              : [],
            `${id}: setParams({ ${simKey} }) 后读数缺少该键` +
              (simKey !== key ? `（meta 键 "${key}" 的映射）` : '') +
              `：在 src/scenes/${id}/ 的 sim setParams/getParams 中支持该键；` +
              'meta 键与 sim 键不一致时在 PARAM_KEY_MAP 登记映射' +
              '（参考 projectile 的 v0→speed），' +
              '纯 UI 状态键在 NON_SIM_KEYS 登记豁免并注明理由'
          ).toContain(simKey);
        }
      } finally {
        s.dispose?.();
      }
    }
  );

  it.each(scenes)('$id: placard 字段非空', ({ id, meta }) => {
    const where = (field: string) =>
      `场景 "${id}" 的 meta.${field} 为空或不合法：在 ` +
      `src/scenes/${id}/scene.meta.ts 中填写该字段，` +
      `参考 src/scenes/projectile/scene.meta.ts`;
    expect(meta.subject.trim().length, where('subject')).toBeGreaterThan(0);
    expect(meta.concept.trim().length, where('concept')).toBeGreaterThan(0);
    expect(meta.subConcepts, where('subConcepts')).toHaveLength(2);
    for (const sub of meta.subConcepts) {
      expect(
        sub.trim().length,
        where('subConcepts（每个子概念须非空字符串）')
      ).toBeGreaterThan(0);
    }
    expect(meta.objective.trim().length, where('objective')).toBeGreaterThan(0);
    expect(meta.keywords.length, where('keywords')).toBeGreaterThan(0);
    for (const kw of meta.keywords) {
      expect(
        kw.trim().length,
        where('keywords（每个关键词须非空字符串）')
      ).toBeGreaterThan(0);
    }
    expect(
      (meta.description ?? '').trim().length,
      where('description')
    ).toBeGreaterThan(0);
  });

  // controls-schema 的 slider/number/select/toggle 字段 key 必须落在场景
  // 参数空间内：多数 sim 的 setParams 是扩散式 {...params, ...next}，
  // 拼错的 key 会被静默吞掉且回环测试照过，只能在此拦截
  it.each(scenes.map((s) => ({ id: s.id })))(
    '$id: controls-schema param field keys exist in the scene param space',
    ({ id }) => {
      const schemas = schemasById.get(id);
      // 纯 imperative 场景（spring-oscillator）无声明式 schema，跳过
      if (!schemas) return;
      const meta = scenes.find((s) => s.id === id)!.meta;
      const allowed = new Set([
        ...Object.keys(meta.defaultParams),
        ...(meta.urlSyncKeys ?? [])
      ]);
      const exempt = NON_PARAM_KEYS[id] ?? {};
      for (const schema of schemas) {
        for (const section of schema.sections) {
          for (const field of section.fields) {
            if (!PARAM_FIELD_TYPES.has(field.type)) continue;
            if (field.key in exempt) continue;
            expect(
              allowed.has(field.key),
              `${id}: controls-schema 字段 "${field.key}" (${field.type}) 不在 ` +
                'defaultParams ∪ urlSyncKeys 中——若是拼错请修正 ' +
                `src/scenes/${id}/controls-schema.ts，若已在 ` +
                `src/scenes/${id}/scene.meta.ts 声明参数请补进 ` +
                'defaultParams/urlSyncKeys，若是合法 action/专用 API 键请在 ' +
                'tests/contract/scene-params-contract.spec.ts 的 ' +
                'NON_PARAM_KEYS 登记并注明理由'
            ).toBe(true);
          }
        }
      }
    }
  );

  // 防陈旧：NON_PARAM_KEYS 的登记必须对应 schema 中真实存在的参数字段
  it('NON_PARAM_KEYS registrations match real schema param fields', () => {
    for (const [id, keys] of Object.entries(NON_PARAM_KEYS)) {
      const schemas = schemasById.get(id);
      expect(
        schemas,
        `${id}: NON_PARAM_KEYS 登记了无 controls-schema 的场景`
      ).toBeDefined();
      const fieldKeys = new Set<string>();
      for (const schema of schemas ?? []) {
        for (const section of schema.sections) {
          for (const field of section.fields) {
            if (PARAM_FIELD_TYPES.has(field.type)) fieldKeys.add(field.key);
          }
        }
      }
      for (const key of Object.keys(keys)) {
        expect(
          fieldKeys.has(key),
          `${id}: NON_PARAM_KEYS 登记的 "${key}" 在 schema 参数字段中不存在，` +
            '登记已陈旧请移除'
        ).toBe(true);
      }
    }
  });
});
