/**
 * 场景脚手架生成器
 *
 * 用法：
 *   pnpm new:scene <id> [title]
 *   pnpm new:scene pendulum 单摆
 *
 * 生成一个符合「当前场景标准」的最小可运行场景骨架：
 * - 文件结构满足 scripts/check-scenes.ts（meta/sim/view/entry/controls-schema/page；
 *   HTML 入口由 vite-plugin-scene-pages 从 scene.meta.ts 虚拟生成，无需手抄）
 * - 视图经由 core 响应式缩放机制（sizeCanvasToFill + responsiveScale）
 * - 视图采用演示模式标准机制（getRenderTokens），自动通过 scene-standard 契约测试
 * - 使用 createStandardSceneEntry 统一生命周期，声明式 controls-schema
 *
 * 生成后无需手动注册：场景由 import.meta.glob 自动发现。
 * 开发者只需替换 sim 的物理逻辑与 view 的绘制逻辑。
 */

import { spawnSync } from 'node:child_process';
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
const testPath = resolve(root, 'tests/unit', `${id}.sim.spec.ts`);

if (existsSync(sceneDir)) fail(`场景已存在: src/scenes/${id}`);

// ---------------------------------------------------------------------------
// 模板（占位符：__ID__ __TITLE__ __PASCAL__ __CAMEL__；生成代码不含模板字面量）
// ---------------------------------------------------------------------------

const metaTpl = `import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
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
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import type { __PASCAL__State } from './scene.sim';

export type Create__PASCAL__ViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function create__PASCAL__View(options: Create__PASCAL__ViewOptions) {
  const canvas = options.canvas ?? document.createElement('canvas');
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas,
    sizing: { mode: 'raw' },
    measure: (c) => {
      const rect = c.getBoundingClientRect();
      return {
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height))
      };
    }
  });

  function render(state: __PASCAL__State): void {
    stage.ensureSized();
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale();
    const tokens = getRenderTokens(scale);

    ctx.clearRect(0, 0, width, height);
    const cx = width / 2 + state.x * width * 0.3;
    const cy = height / 2;
    ctx.fillStyle = env.theme === 'dark' ? '#e2e8f0' : '#1a202c';
    ctx.beginPath();
    ctx.arc(cx, cy, tokens.pointRadiusPx * stage.responsiveScale, 0, Math.PI * 2);
    ctx.fill();
  }

  stage.resize();

  return {
    render,
    resize: () => stage.resize(),
    reset(): void {},
    setTheme(t: TeachingTheme): void {
      env.setTheme(t);
    },
    setMode(m: TeachingMode, h?: DemoRenderHints): void {
      env.setMode(m, h);
    },
    dispose(): void {
      stage.release();
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
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

function formatReadout(state: __PASCAL__State, params: __PASCAL__Params) {
  return [
    { key: 't', label: '时间 t', value: state.t.toFixed(2) + ' s' },
    { key: 'x', label: 'x', value: state.x.toFixed(3) },
    { key: 'speed', label: 'speed', value: params.speed.toFixed(2) }
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
  // URL 参数（键集 = meta.defaultParams ∪ meta.urlSyncKeys）由
  // bootstrapper 参数管线自动应用与回写，无需手写样板。
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: __CAMEL__ControlsSchema,
      onChange: (key, value) => {
        scene.setParams({ [key]: value } as Partial<__PASCAL__Params>);
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });

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
  [testPath, testTpl]
];

for (const [path, template] of files) {
  writeFileSync(path, render(template), 'utf8');
}

console.log(`\n✓ 已生成场景 "${id}"（${title}）：\n`);
for (const [path] of files) {
  console.log('  ' + path.replace(root + '/', ''));
}

// ---------------------------------------------------------------------------
// 生成后自检 + 剩余待办清单
// ---------------------------------------------------------------------------

// meta 四字段的行号从实际生成内容中解析，避免模板改动后提示失真
const metaRelPath = `src/scenes/${id}/scene.meta.ts`;
const metaLines = render(metaTpl).split('\n');
function metaLine(key: string): string {
  const index = metaLines.findIndex((line) =>
    line.trimStart().startsWith(`${key}:`)
  );
  return index >= 0 ? `${metaRelPath}:${index + 1}` : metaRelPath;
}

// 结构自检：失败不阻断脚手架（退出码仍为 0），但在待办清单中标注
console.log('\n运行 pnpm check:scenes 自检…\n');
const check = spawnSync('pnpm', ['check:scenes'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
const checkFailed = check.status !== 0;

console.log(`
剩余待办清单：
  ${checkFailed ? '[!]' : '[ ]'} pnpm check:scenes ${
    checkFailed
      ? '未通过（见上方输出）——脚手架不因此失败，但提交前必须修复'
      : '已通过'
  }
  [ ] 填写 meta 四字段（契约测试 scene-params-contract 强制非空，留空必挂）：
      - concept       ${metaLine('concept')}
      - subConcepts   ${metaLine('subConcepts')}（两项均需非空）
      - objective     ${metaLine('objective')}
      - description   ${metaLine('description')}
  [ ] 补全 ${metaRelPath} 的 defaultParams / keywords，使之贴合实际物理参数
  [ ] 编辑 src/scenes/${id}/scene.sim.ts 实现物理逻辑
  [ ] 编辑 src/scenes/${id}/scene.view.ts 实现绘制（保留响应式缩放与演示模式机制）
  [ ] 按需调整 controls-schema.ts 的控件
  [ ] 生成双平台视觉基线（规则见 AGENTS.md「视觉回归基线规则」）：
      - Linux: scripts/visual-linux-container.sh update（或 CI 重生成 artifact）
      - Mac:   pnpm test:visual:update（或 update-darwin-snapshots.yml）
  [ ] pnpm quality:core 验证（场景由 import.meta.glob 自动发现，无需注册）
`);
