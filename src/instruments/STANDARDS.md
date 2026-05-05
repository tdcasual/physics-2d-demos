# 仪器组件使用规范

> 所有 `src/instruments/*/` 下的组件必须遵循此规范。

## 1. 目录结构

每个仪器是一个独立的子目录，**必须**包含以下文件：

```
src/instruments/<id>/
├── index.ts              # 统一导出 InstrumentFactory（必须）
├── <id>.sim.ts           # 模拟逻辑（必须）
├── <id>.view.ts          # Canvas 渲染（必须）
├── <id>.meta.ts          # 元数据（必须）
└── <id>.controls.ts      # 控制面板 schema（可选）
```

此外，必须在清单中注册：

```
src/instruments/_manifest/manifest.ts   # 在 instrumentManifest 数组中追加记录
```

### 命名规则

| 项目 | 规则 | 示例 |
|---|---|---|
| 目录名 | kebab-case | `vernier-caliper` |
| 工厂变量 | 与目录同名 | `export const vernierCaliper = {...}` |
| Sim 函数 | `create<Id>Sim` | `createVernierCaliperSim` |
| View 函数 | `create<Id>View` | `createVernierCaliperView` |
| Meta 变量 | `<id>Meta` | `vernierCaliperMeta` |

## 2. Sim 规范

### 职责边界

- **只管理状态**，不感知 DOM、Canvas、React
- 不依赖 `app/`、`ui/`、`scenes/`

### 接口要求

```typescript
export interface MyState extends InstrumentState {
  reading: number;
  // ... 其他字段
}

export interface MyParams extends InstrumentParams {
  reading: number;
  // ... 其他字段
}

export function createMySim(initial: MyParams): InstrumentSim<MyState, MyParams> {
  let state: MyState = { /* 初始状态 */ };

  return {
    getState: () => state,
    setParams: (p) => {
      if (p.reading !== undefined) state = { ...state, reading: p.reading };
      // 部分更新：只更新提供的字段
    },
    step: (dt) => {
      // dt: 毫秒
      // 物理/逻辑步进
    },
    reset: () => {
      state = { /* 恢复到 initial 对应的初始状态 */ };
    },
  };
}
```

### 禁止

- ❌ 在 Sim 中直接操作 DOM
- ❌ 在 Sim 中创建 Canvas 或调用 Canvas API
- ❌ Sim 依赖 View 的状态
- ❌ 使用 `any` 类型

## 3. View 规范

### 职责边界

- **只负责渲染**，不管理业务逻辑
- 接收 `state` 并绘制到 Canvas，不修改 state

### 接口要求

```typescript
export function createMyView(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
}): InstrumentView<MyState> {
  let { canvas, theme, viewport } = options;
  let ctx = canvas.getContext('2d')!;

  function render(state: MyState) {
    withViewport(ctx, viewport, (w, h) => {
      // 清屏
      ctx.clearRect(0, 0, w, h);

      // 获取响应式缩放因子
      const scale = parseFloat(canvas.dataset.responsiveScale || '1');

      // 所有绘制尺寸必须基于 scale
      // ✅ ctx.arc(x, y, 45 * scale, 0, Math.PI * 2);
      // ❌ ctx.arc(x, y, 45, 0, Math.PI * 2);

      drawMyInstrument(ctx, state, w, h, scale, theme);
    });
  }

  function resize() {
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
  }

  function setTheme(t: TeachingTheme) {
    theme = t;
  }

  function setViewport(v: InstrumentViewport) {
    viewport = v;
  }

  function dispose() {
    // 清理动画帧、事件监听等
  }

  return { render, resize, setTheme, setViewport, dispose };
}
```

### Canvas 响应式渲染（强制）

与项目全局规范一致：

- **禁止裸数字**：所有大于 50 的像素尺寸必须使用 `responsiveScale`
- **必须使用** `canvas.dataset.responsiveScale` 或 `getResponsiveScale`
- 桌面端（短边 ~500px）→ scale ≈ 0.8~1.0
- 移动端（短边 ~200px）→ scale ≈ 0.3~0.5

```typescript
import { sizeCanvasToFill } from '../../core/canvas-sizing';

function resize() {
  sizeCanvasToFill(canvas);
  const scale = parseFloat(canvas.dataset.responsiveScale || '1');
  // 所有绘制基于此 scale
}
```

### Viewport 处理

组合场景下，仪器在 Canvas 的局部区域绘制：

```typescript
import { withViewport } from '../_utils/viewport';

function render(state) {
  withViewport(ctx, viewport, (w, h) => {
    // (0, 0) 是视口左上角
    // (w, h) 是视口宽高
    // 超出此区域的绘制会被自动裁剪
  });
}
```

### 禁止

- ❌ View 修改 Sim 的状态
- ❌ View 直接调用 `sim.step()`
- ❌ View 中硬编码主题色（使用 CSS 变量或 theme 参数）
- ❌ View 中创建多个 Canvas 元素

## 4. Meta 规范

### 必填字段

```typescript
export const myMeta: InstrumentMeta<MyParams> = {
  id: 'my-instrument',           // kebab-case，全局唯一
  title: '我的仪器',              // 中文显示名称
  category: 'measurement',       // 必须是：measurement | electronics | optics | mechanics
  description: '一句话描述仪器的用途',
  defaultParams: { reading: 0 }, // 所有参数必须有默认值
  unit: 'mm',                    // 可选：测量单位
  precision: 0.01,               // 可选：最小分度值
};
```

### 分类定义

| 分类 | 说明 | 示例 |
|---|---|---|
| `measurement` | 测量仪器 | 螺旋测微器、游标卡尺、秒表 |
| `electronics` | 电子仪器 | 示波器、万用表 |
| `optics` | 光学仪器 | 光具座、干涉仪 |
| `mechanics` | 力学仪器 | 气垫导轨、打点计时器 |

新增分类需修改 `InstrumentCategory` 类型定义。

## 5. 工厂规范

### 组装方式

```typescript
// instruments/my-instrument/index.ts
import type { InstrumentFactory } from '../_contract/instrument-contract';
import { myMeta } from './my-instrument.meta';
import { createMySim } from './my-instrument.sim';
import { createMyView } from './my-instrument.view';

export const myInstrument: InstrumentFactory<MyState, MyParams> = {
  meta: myMeta,
  createSim: createMySim,
  createView: createMyView,
};

// 可选：额外导出类型和子模块
export * from './my-instrument.sim';
export * from './my-instrument.meta';
```

### 注册

**两步注册**（支持上百个组件的按需加载）：

**Step 1**: 在 `src/instruments/_manifest/manifest.ts` 中追加元数据：

```typescript
export const instrumentManifest: InstrumentManifestEntry[] = [
  // ... 已有仪器
  {
    id: 'my-instrument',
    title: '我的仪器',
    category: 'measurement',
    description: '一句话描述',
    defaultParams: { reading: 0 },
    unit: 'mm',
    precision: 0.01,
    modulePath: '/src/instruments/my-instrument/index.ts',
  },
];
```

**Step 2**: 在 `src/instruments/index.ts` 中导出（可选，供外部直接 import）：

```typescript
export { myInstrument } from './my-instrument';
```

**为什么用 manifest 而不是自动发现？**

- `import.meta.glob` + `eager: true` 会一次性加载所有组件代码，上百个组件时首屏 chunk 会膨胀到数 MB
- manifest 是纯数据文件（几 KB），列表页加载极快
- 工厂代码通过 `import()` 按需加载，每个仪器独立成一个 chunk
- 点击仪器时才请求对应的 `instrument-<id>.js`，互不影响

## 6. 测试规范

### Sim 测试（必须）

每个 Sim 必须有单元测试，验证状态管理：

```typescript
// tests/unit/instruments/my-instrument.sim.spec.ts
import { describe, it, expect } from 'vitest';
import { createMySim } from '../../../src/instruments/my-instrument/my-instrument.sim';

describe('MyInstrument Sim', () => {
  it('初始状态正确', () => {
    const sim = createMySim({ reading: 0 });
    expect(sim.getState().reading).toBe(0);
  });

  it('setParams 更新状态', () => {
    const sim = createMySim({ reading: 0 });
    sim.setParams({ reading: 5 });
    expect(sim.getState().reading).toBe(5);
  });

  it('reset 恢复到初始值', () => {
    const sim = createMySim({ reading: 0 });
    sim.setParams({ reading: 10 });
    sim.reset();
    expect(sim.getState().reading).toBe(0);
  });
});
```

### View 测试（可选但推荐）

至少验证 `render()` 不会抛出异常：

```typescript
import { describe, it, expect } from 'vitest';
import { createMyView } from '../../../src/instruments/my-instrument/my-instrument.view';

describe('MyInstrument View', () => {
  it('render 不抛异常', () => {
    const canvas = document.createElement('canvas');
    const view = createMyView({ canvas, theme: 'light' });
    expect(() => view.render({ reading: 0 })).not.toThrow();
    view.dispose();
  });
});
```

## 7. 依赖规则

```
instruments/<id>/*.ts
  → 可依赖: core/*, platform/*, instruments/_contract/*, instruments/_utils/*
  → 禁止依赖: app/*, ui/*, scenes/*
```

ESLint 已配置此规则，违反会导致构建失败。

## 8. 性能与扩展性

### 代码分割

Vite 配置已为每个仪器生成独立 chunk：

```
dist/assets/instrument-micrometer-xxx.js      # 螺旋测微器代码
 dist/assets/instrument-vernier-caliper-xxx.js # 游标卡尺代码
 dist/assets/instruments-core-xxx.js           # 基础设施代码（合约+工具）
```

- 组件库审计页面首屏只加载 `instruments-core.js`（几 KB）
- 点击仪器时才加载对应的 `instrument-<id>.js`
- 100 个组件 = 100 个独立 chunk，互不影响

### 首屏加载估算

| 组件数量 | 首屏加载 | 点击仪器后额外加载 |
|---|---|---|
| 10 个 | ~5 KB (manifest) | ~20-50 KB / 仪器 |
| 100 个 | ~5 KB (manifest) | ~20-50 KB / 仪器 |
| 500 个 | ~10 KB (manifest) | ~20-50 KB / 仪器 |

> manifest 增长极慢：每条记录约 50-100 bytes，500 个组件约 25-50 KB。

### 运行时内存

- 列表页：只持有元数据（无 Canvas、无 Sim 实例）
- 预览单个仪器：1 个 Sim + 1 个 View + 1 个 Canvas
- 切换仪器：旧的 Sim/View 被 dispose，内存释放

## 9. 审查清单

新增仪器 PR 必须通过以下检查：

- [ ] 目录结构符合规范（index.ts / sim.ts / view.ts / meta.ts）
- [ ] 已在 `_manifest/manifest.ts` 中注册
- [ ] Sim 不依赖 DOM/Canvas
- [ ] View 使用 `sizeCanvasToFill` 和 `responsiveScale`
- [ ] View 中没有大于 50 的裸数字像素尺寸
- [ ] View 使用 `withViewport` 处理局部绘制
- [ ] Meta 的 `id` 全局唯一，`category` 在预定义列表中
- [ ] Sim 有单元测试覆盖
- [ ] `pnpm build` 无错误，生成独立的 `instrument-<id>.js` chunk
- [ ] `pnpm test` 全部通过
- [ ] 组件库审计页面 (`/instruments.html`) 能正确显示新仪器
