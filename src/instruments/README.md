# 仪器组件库（Instruments）

> 可复用的物理实验仪器集合。
> 每个仪器 = Sim（状态/逻辑）+ View（Canvas 渲染）+ Meta（元数据）。

## 目录结构

```
src/instruments/
├── _contract/
│   └── instrument-contract.ts     # 通用接口（Sim / View / Meta / Factory）
├── _utils/
│   └── viewport.ts                # 视口裁剪、坐标变换工具
├── index.ts                       # 统一导出入口
├── micrometer/                    # 螺旋测微器（未来添加）
│   ├── micrometer.sim.ts
│   ├── micrometer.view.ts
│   ├── micrometer.meta.ts
│   └── index.ts
├── vernier-caliper/               # 游标卡尺（未来添加）
└── ...
```

## 添加新仪器的步骤

### 1. 定义参数和状态类型

```typescript
// my-instrument/my-instrument.sim.ts
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
// my-instrument/my-instrument.view.ts
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
// my-instrument/my-instrument.meta.ts
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
// my-instrument/index.ts
import type { InstrumentFactory } from '../_contract/instrument-contract';
import { myInstrumentMeta } from './my-instrument.meta';
import { createMyInstrumentSim } from './my-instrument.sim';
import { createMyInstrumentView } from './my-instrument.view';
import type {
  MyInstrumentState,
  MyInstrumentParams
} from './my-instrument.sim';

export const myInstrument: InstrumentFactory<
  MyInstrumentState,
  MyInstrumentParams
> = {
  meta: myInstrumentMeta,
  createSim: createMyInstrumentSim,
  createView: createMyInstrumentView
};

export * from './my-instrument.sim';
export * from './my-instrument.meta';
```

### 5. 注册到统一入口

```typescript
// src/instruments/index.ts
export { myInstrument } from './my-instrument';
```

## 场景使用方式

### 单一仪器场景

场景是仪器的**薄包装**，只负责引导页注册和控制面板。

```typescript
// scenes/my-instrument-scene/scene.entry.ts
import { myInstrument } from '../../instruments';
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
import { micrometer } from '../../instruments';
import { vernierCaliper } from '../../instruments';

export function createMeasurementLabScene({ canvas, theme }) {
  const w = canvas.width;
  const h = canvas.height;

  const mSim = micrometer.createSim({ reading: 0 });
  const mView = micrometer.createView({
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
