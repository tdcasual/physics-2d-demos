# 仪器组件库（Instruments）

> 可复用的物理实验仪器集合。
> 每个仪器 = Sim（状态/逻辑）+ View（Canvas 渲染）+ Meta（元数据）。

## 目录结构

```
src/instruments/
├── _contract/
│   └── instrument-contract.ts     # 通用接口（Sim / View / Meta / Factory）
├── _manifest/
│   └── manifest.ts                # 仪器清单（纯元数据，注册表与审计读取）
├── _utils/
│   └── viewport.ts                # 视口裁剪、坐标变换工具
├── index.ts                       # 统一导出入口（仅契约类型 + 工具函数）
├── instrument-registry.ts         # 注册表（import.meta.glob 按需懒加载工厂）
├── spiral-micrometer/             # 螺旋测微器（千分尺）
├── vernier-caliper/               # 游标卡尺
├── micrometer-eyepiece/           # 测微目镜（高精度干涉测微仪）
├── interference-vernier-caliper/  # 干涉游标卡尺
└── <my-instrument>/               # 新仪器目录，固定文件名约定：
    ├── instrument.sim.ts          #   状态/逻辑
    ├── instrument.view.ts         #   Canvas 渲染
    ├── instrument.meta.ts         #   元数据
    ├── instrument.entry.ts        #   组装工厂（导出 <name>Factory）
    ├── controls-schema.ts         #   控制面板 schema（可选）
    └── index.ts                   #   模块出口（re-export 工厂）
```

## 添加新仪器的步骤

### 1. 定义参数和状态类型

```typescript
// my-instrument/instrument.sim.ts
export interface MyInstrumentParams {
  value: number;
}

export interface MyInstrumentState extends InstrumentState {
  value: number;
  timestamp: number;
}

export function createMyInstrumentSim(
  initial: MyInstrumentParams
): InstrumentSim<MyInstrumentState, MyInstrumentParams> {
  let state: MyInstrumentState = { value: initial.value, timestamp: 0 };

  return {
    getState: () => state,
    setParams: (p) => {
      if (p.value !== undefined) state = { ...state, value: p.value };
    },
    step: (dt) => {
      state = { ...state, timestamp: state.timestamp + dt };
    },
    reset: () => {
      state = { value: initial.value, timestamp: 0 };
    }
  };
}
```

### 2. 实现 Canvas 渲染

```typescript
// my-instrument/instrument.view.ts
export function createMyInstrumentView(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
}): InstrumentView<MyInstrumentState> {
  const { canvas, theme, viewport } = options;
  let ctx = canvas.getContext('2d')!;
  let currentViewport = viewport;

  function render(state: MyInstrumentState) {
    withViewport(ctx, currentViewport, (w, h) => {
      ctx.clearRect(0, 0, w, h);
      // 绘制仪器...
    });
  }

  return {
    render,
    resize: () => {
      /* 响应尺寸变化 */
    },
    setTheme: (t) => {
      /* 切换主题 */
    },
    setViewport: (v) => {
      currentViewport = v;
    },
    dispose: () => {
      /* 清理 */
    }
  };
}
```

### 3. 定义元数据

```typescript
// my-instrument/instrument.meta.ts
export const myInstrumentMeta: InstrumentMeta<MyInstrumentParams> = {
  id: 'my-instrument',
  title: '我的仪器',
  category: 'measurement',
  description: '示例仪器',
  defaultParams: { value: 0 },
  unit: 'mm',
  precision: 0.01
};
```

### 4. 组装工厂并导出

```typescript
// my-instrument/instrument.entry.ts
import type { InstrumentFactory } from '../_contract/instrument-contract';
import { myInstrumentMeta } from './instrument.meta';
import { createMyInstrumentSim } from './instrument.sim';
import { createMyInstrumentView } from './instrument.view';
import type { MyInstrumentState, MyInstrumentParams } from './instrument.sim';

export const myInstrumentFactory: InstrumentFactory<
  MyInstrumentState,
  MyInstrumentParams
> = {
  meta: myInstrumentMeta,
  createSim: createMyInstrumentSim,
  createView: createMyInstrumentView
};
```

```typescript
// my-instrument/index.ts — 模块出口，re-export 工厂
export { myInstrumentFactory as myInstrument } from './instrument.entry';
```

### 5. 注册到仪器清单

新仪器必须在 `_manifest/manifest.ts` 的 `instrumentManifest` 中登记纯元数据
（id / title / category / description / defaultParams / modulePath），
注册表（`instrument-registry.ts`）通过 `import.meta.glob` 按目录自动发现工厂并懒加载。
`src/instruments/index.ts` 只导出契约类型与工具函数，无需修改。

## 场景使用方式

### 单一仪器场景

场景是仪器的**薄包装**，只负责引导页注册和控制面板。

```typescript
// scenes/my-instrument-scene/scene.entry.ts
import { myInstrument } from '../../instruments/my-instrument';
import { createStandardSceneEntry } from '../scene-entry-helpers';

export function createMyInstrumentScene({ canvas, theme }) {
  const sim = myInstrument.createSim(myInstrument.meta.defaultParams);
  const view = myInstrument.createView({ canvas, theme });

  return createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState()
  });
}
```

### 组合场景

一个 Canvas 上放置多个仪器，各自有独立的 viewport。

```typescript
// scenes/measurement-lab/scene.entry.ts
import { spiralMicrometer } from '../../instruments/spiral-micrometer';
import { vernierCaliper } from '../../instruments/vernier-caliper';

export function createMeasurementLabScene({ canvas, theme }) {
  const w = canvas.width;
  const h = canvas.height;

  const mSim = spiralMicrometer.createSim({ reading: 0 });
  const mView = spiralMicrometer.createView({
    canvas,
    theme,
    viewport: { x: 0, y: 0, width: w, height: h * 0.5 }
  });

  const vSim = vernierCaliper.createSim({ reading: 0 });
  const vView = vernierCaliper.createView({
    canvas,
    theme,
    viewport: { x: 0, y: h * 0.5, width: w, height: h * 0.5 }
  });

  return {
    init() {
      mView.resize();
      vView.resize();
    },
    step(dt) {
      mSim.step(dt);
      vSim.step(dt);
    },
    render() {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      mView.render(mSim.getState());
      vView.render(vSim.getState());
    },
    resize() {
      const w = canvas.width;
      const h = canvas.height;
      mView.setViewport({ x: 0, y: 0, width: w, height: h * 0.5 });
      vView.setViewport({ x: 0, y: h * 0.5, width: w, height: h * 0.5 });
      mView.resize();
      vView.resize();
    },
    setTheme(t) {
      mView.setTheme(t);
      vView.setTheme(t);
    },
    dispose() {
      mView.dispose();
      vView.dispose();
    }
  };
}
```

## 依赖规则

- `instruments/` 可依赖 `core/`、`platform/`
- `instruments/` **不可**依赖 `app/`、`ui/`、`scenes/`
- `scenes/`（非 page.ts）可依赖 `instruments/`、`core/`、`platform/`
- `scenes/` **不可**依赖 `app/`、`ui/`
- `app/` 可依赖 `instruments/`、`ui/`、`core/`、`platform/`
