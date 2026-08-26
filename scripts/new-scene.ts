/**
 * 场景脚手架生成器
 *
 * 用法：
 *   pnpm new:scene <id> [title]
 *   pnpm new:scene pendulum 单摆
 *
 * 生成一个符合「当前场景标准」的最小可运行场景骨架：
 * - 文件结构满足 scripts/check-scenes.ts（meta/sim/view/entry/controls-schema/page + html）
 * - 视图经由 core 响应式缩放机制（sizeCanvasToFill + responsiveScale）
 * - 视图采用演示模式标准机制（getRenderTokens），自动通过 scene-standard 契约测试
 * - 使用 createStandardSceneEntry 统一生命周期，声明式 controls-schema
 *
 * 生成后无需手动注册：场景由 import.meta.glob 自动发现。
 * 开发者只需替换 sim 的物理逻辑与 view 的绘制逻辑。
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const [, , rawId, rawTitle] = process.argv;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!rawId) {
  fail('用法: pnpm new:scene <id> [title]，例如 pnpm new:scene pendulum 单摆');
}

const id = rawId.trim();
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  fail(
    `场景 id 必须是 kebab-case（小写字母/数字，单词以 - 连接），收到: "${id}"`
  );
}

const title = (rawTitle ?? id).trim();

// my-scene -> MyScene
const pascal = id
  .split('-')
  .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
  .join('');
// my-scene -> myScene
const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);

const sceneDir = resolve(root, 'src/scenes', id);
const pagePath = resolve(root, 'src/pages', `${id}.html`);
const testPath = resolve(root, 'tests/unit', `${id}.sim.spec.ts`);

if (existsSync(sceneDir)) fail(`场景已存在: src/scenes/${id}`);
if (existsSync(pagePath)) fail(`页面已存在: src/pages/${id}.html`);

// ---------------------------------------------------------------------------
// 模板（占位符：__ID__ __TITLE__ __PASCAL__ __CAMEL__；生成代码不含模板字面量）
// ---------------------------------------------------------------------------

const metaTpl = `import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  controlPanel: 'minimal',
  readoutPanel: 'overlay',
  renderHints: { contentScale: 1.5 },
  interactionHints: { touchTargetMinSize: 48, visibleControlKeys: [] }
};

export const __CAMEL__Meta: SceneMeta = {
  id: '__ID__',
  title: '__TITLE__',
  path: '/src/pages/__ID__.html',
  subject: '力学',
  concept: '',
  subConcepts: ['', ''],
  keywords: ['__ID__', '2D'],
  objective: '',
  description: '',
  difficulty: 2,
  icon: '📐',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    speed: 1
  },
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
`;

const simTpl = `export type __PASCAL__Params = {
  speed: number;
};

export type __PASCAL__State = {
  t: number;
  x: number;
};

export function create__PASCAL__Sim(initial: __PASCAL__Params) {
  let params = { ...initial };
  const state: __PASCAL__State = { t: 0, x: 0 };

  return {
    getState(): __PASCAL__State {
      return { ...state };
    },
    getParams(): __PASCAL__Params {
      return { ...params };
    },
    setParams(next: Partial<__PASCAL__Params>): __PASCAL__Params {
      params = { ...params, ...next };
      return { ...params };
    },
    step(dt: number): void {
      state.t += dt;
      state.x = Math.sin(state.t * params.speed);
    },
    reset(): void {
      state.t = 0;
      state.x = 0;
    }
  };
}
`;

const viewTpl = `import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { getRenderTokens } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { __PASCAL__State } from './scene.sim';

export type Create__PASCAL__ViewOptions = {
  canvas: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function create__PASCAL__View(options: Create__PASCAL__ViewOptions) {
  const canvas = options.canvas;
  let theme: TeachingTheme = options.theme ?? 'light';
  let mode: TeachingMode = options.mode ?? 'normal';
  let hints: DemoRenderHints | undefined = options.demoHints;
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 0;
  let height = 0;
  let responsiveScale = 1;

  function resize(): void {
    ctx = sizeCanvasToFill(canvas);
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    responsiveScale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  function render(state: __PASCAL__State): void {
    if (!ctx || width === 0) {
      resize();
      if (!ctx) return;
    }
    // 演示模式下按 demoHints.contentScale 放大渲染 token
    const scale = mode === 'presentation' ? (hints?.contentScale ?? 1.5) : 1;
    const tokens = getRenderTokens(scale);

    ctx.clearRect(0, 0, width, height);
    const cx = width / 2 + state.x * width * 0.3;
    const cy = height / 2;
    ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#1a202c';
    ctx.beginPath();
    ctx.arc(cx, cy, tokens.pointRadiusPx * responsiveScale, 0, Math.PI * 2);
    ctx.fill();
  }

  resize();

  return {
    render,
    resize,
    reset(): void {},
    setTheme(t: TeachingTheme): void {
      theme = t;
    },
    setMode(m: TeachingMode, h?: DemoRenderHints): void {
      mode = m;
      hints = h;
    },
    dispose(): void {
      ctx = null;
    }
  };
}
`;

const entryTpl = `import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { __CAMEL__Meta } from './scene.meta';
import {
  create__PASCAL__Sim,
  type __PASCAL__Params,
  type __PASCAL__State
} from './scene.sim';
import { create__PASCAL__View } from './scene.view';

const defaultParams: __PASCAL__Params = {
  speed: __CAMEL__Meta.defaultParams.speed ?? 1
};

export type Create__PASCAL__SceneOptions = {
  canvas: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

function formatReadout(state: __PASCAL__State, params: __PASCAL__Params) {
  return [
    { label: '时间 t', value: state.t.toFixed(2) + ' s' },
    { label: 'x', value: state.x.toFixed(3) },
    { label: 'speed', value: params.speed.toFixed(2) }
  ];
}

export function create__PASCAL__Scene(
  options: Create__PASCAL__SceneOptions = {} as Create__PASCAL__SceneOptions
) {
  const sim = create__PASCAL__Sim(defaultParams);
  const view = create__PASCAL__View({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState()
  });

  return {
    ...base,
    getState: (): __PASCAL__State => sim.getState(),
    getParams: (): __PASCAL__Params => sim.getParams(),
    setParams(next: Partial<__PASCAL__Params>): __PASCAL__Params {
      const params = sim.setParams(next);
      base.notify();
      return params;
    },
    getReadoutItems() {
      return formatReadout(sim.getState(), sim.getParams());
    }
  };
}
`;

const controlsTpl = `import type { ControlsSchema } from '../../platform/controls-schema';

export const __CAMEL__ControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'speed',
          label: 'speed',
          min: 0,
          max: 5,
          step: 0.1,
          value: 1,
          unit: ''
        }
      ]
    }
  ]
};
`;

const pageTpl = `import { bootScenePage } from '../../app/scene-bootstrapper';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { create__PASCAL__Scene } from './scene.entry';
import { __CAMEL__Meta } from './scene.meta';
import { __CAMEL__ControlsSchema } from './controls-schema';
import type { __PASCAL__Params } from './scene.sim';

bootScenePage({
  meta: __CAMEL__Meta,
  preferredLayout: 'split-right',
  layoutConfig: {
    controlColumns: 'auto',
    readoutCollapsed: true
  },
  createScene: ({ canvas, theme, mode, demoHints }) =>
    create__PASCAL__Scene({ canvas, theme, mode, demoHints }),
  createControls: ({ mount, scene }) => {
    const renderer = renderSchema({
      mount,
      schema: __CAMEL__ControlsSchema,
      onChange: (key, value) => {
        scene.setParams({ [key]: value } as Partial<__PASCAL__Params>);
        writeSceneParams({ [key]: value });
      },
      onAction: () => {}
    });

    // 应用 URL 参数（键集 = meta.defaultParams ∪ meta.urlSyncKeys）
    const urlParams = readSceneParams(__CAMEL__Meta);
    for (const [key, value] of Object.entries(urlParams)) {
      if (key in __CAMEL__Meta.defaultParams) {
        const num = Number.isInteger(__CAMEL__Meta.defaultParams[key])
          ? parseInt(String(value), 10)
          : parseFloat(String(value));
        scene.setParams({ [key]: num } as Partial<__PASCAL__Params>);
        renderer.setValue(key, num);
      }
    }

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
      dispose: () => renderer.dispose()
    };
  }
});
`;

const htmlTpl = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>__TITLE__ - 物理演示</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="../scenes/__ID__/page.ts"></script>
  </body>
</html>
`;

const testTpl = `import { describe, expect, it } from 'vitest';
import { create__PASCAL__Sim } from '../../src/scenes/__ID__/scene.sim';

describe('__ID__ sim', () => {
  it('advances state on step', () => {
    const sim = create__PASCAL__Sim({ speed: 1 });
    sim.step(0.1);
    expect(sim.getState().t).toBeCloseTo(0.1);
  });

  it('reset returns to initial state', () => {
    const sim = create__PASCAL__Sim({ speed: 1 });
    sim.step(1);
    sim.reset();
    expect(sim.getState().t).toBe(0);
    expect(sim.getState().x).toBe(0);
  });
});
`;

// ---------------------------------------------------------------------------
// 写入
// ---------------------------------------------------------------------------

function render(template: string): string {
  return template
    .replace(/__ID__/g, id)
    .replace(/__TITLE__/g, title)
    .replace(/__PASCAL__/g, pascal)
    .replace(/__CAMEL__/g, camel);
}

mkdirSync(sceneDir, { recursive: true });

const files: Array<[string, string]> = [
  [join(sceneDir, 'scene.meta.ts'), metaTpl],
  [join(sceneDir, 'scene.sim.ts'), simTpl],
  [join(sceneDir, 'scene.view.ts'), viewTpl],
  [join(sceneDir, 'scene.entry.ts'), entryTpl],
  [join(sceneDir, 'controls-schema.ts'), controlsTpl],
  [join(sceneDir, 'page.ts'), pageTpl],
  [pagePath, htmlTpl],
  [testPath, testTpl]
];

for (const [path, template] of files) {
  writeFileSync(path, render(template), 'utf8');
}

console.log(`\n✓ 已生成场景 "${id}"（${title}）：\n`);
for (const [path] of files) {
  console.log('  ' + path.replace(root + '/', ''));
}
console.log(`
下一步：
  1. 编辑 src/scenes/${id}/scene.sim.ts 实现物理逻辑
  2. 编辑 src/scenes/${id}/scene.view.ts 实现绘制（保留响应式缩放与演示模式机制）
  3. 完善 src/scenes/${id}/scene.meta.ts 的 concept / keywords / objective / defaultParams
  4. 按需调整 controls-schema.ts 的控件
  5. pnpm quality:core 验证（场景由 import.meta.glob 自动发现，无需注册）
`);
