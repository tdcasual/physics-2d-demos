# 场景开发规范

> 本文档定义创建新场景或迁移旧场景到统一框架的硬性要求。
>
> 旧版 `createTeachingDemoShell()` API 已废弃，所有场景统一使用 `bootScenePage()`。

---

## 一、何时需要新建/迁移场景

### 1.1 新建场景

- 有新的物理概念需要可视化演示
- 已有 legacy 场景需要接入 modern 统一框架（获得布局自适应、主题切换、E2E 测试等能力）

### 1.2 禁止直接修改的场景

- 3D WebGL 场景（使用 Three.js 的独立渲染循环，需单独评估）
- iframe 嵌入的外部内容

---

## 二、文件结构要求

新建场景必须遵循以下文件结构：

```
src/scenes/<scene-id>/
├── scene.meta.ts          # 场景元数据（subject / concept / keywords）
├── scene.sim.ts           # 物理仿真（纯计算，零 DOM 依赖）
├── scene.view.ts          # Canvas 渲染（接收 snapshot，绘制帧）
├── scene.entry.ts         # 场景组装入口（导出 createScene）
├── controls-v4.ts         # 控制面板（参数调节 UI，v4 标准）
└── page.ts                # 页面入口（调用 bootScenePage）

src/pages/<scene-id>.html   # HTML 入口（Vite 自动扫描，无需手动注册）
```

### 2.1 必须实现的文件

| 文件             | 必须 | 说明                                                      |
| ---------------- | ---- | --------------------------------------------------------- |
| `scene.meta.ts`  | ✅   | 导出 `SceneMeta`，包含 subject/concept/keywords/objective |
| `scene.sim.ts`   | ✅   | 导出仿真工厂，返回 `{ init, reset, step, getSnapshot }`   |
| `scene.view.ts`  | ✅   | 导出渲染工厂，接收 canvas 和 snapshot，绘制帧             |
| `scene.entry.ts` | ✅   | 组装 sim + view，返回 `SceneInstance`                     |
| `controls-v4.ts` | ✅   | 导出控制面板构建函数                                      |
| `page.ts`        | ✅   | 调用 `bootScenePage()`，唯一入口                          |

---

## 三、page.ts 最小实现

```typescript
import { bootScenePage } from '../../app/scene-bootstrapper';
import { createProjectileScene } from './scene.entry';
import { createProjectileControlsV4 } from './controls-v4';
import { projectileMeta } from './scene.meta';

bootScenePage({
  meta: projectileMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: true
  },
  createScene: ({ canvas, theme, mode }) => {
    return createProjectileScene({ canvas, theme, mode });
  },
  createControls: ({ mount, scene }) => {
    return createProjectileControlsV4({
      mount,
      onParamChange: (key, value) => {
        (scene as unknown as { setParams(p: object): void }).setParams({
          [key]: value
        });
      },
      onPresetSelect: (preset) => {
        // 应用预设参数
      }
    });
  }
});
```

### 3.1 禁止在 page.ts 中做的事

- ❌ 手动调用 `scene.init()` —— `SceneAdapter` 自动调用
- ❌ 手动调用 `scene.setTheme()` —— `SceneAdapter` 自动调用
- ❌ 手动调用 `scene.resize()` —— `SceneContainer` 通过 ResizeObserver 自动调用
- ❌ 硬编码布局注册 —— 使用 `auto-register.ts`

---

## 四、SceneInstance 必须实现的契约

```typescript
interface SceneInstance {
  // === 生命周期（必须）===
  init(): void; // 初始化仿真状态和渲染
  resize(): void; // 响应画布尺寸变化
  render(): void; // 绘制当前帧
  dispose(): void; // 清理资源（事件监听、RAF、定时器）

  // === 主题/模式（必须）===
  setTheme(theme: Theme): void;
  setMode(mode: 'normal' | 'presentation'): void;

  // === 动画控制（必须）===
  step(dt: number): void; // 单步推进仿真

  // === 可选但强烈建议 ===
  reset?(): void; // 重置到初始状态
  startAll?(): void; // 启动 RAF 动画循环
  pauseAll?(): void; // 停止 RAF 动画循环
  setTimeScale?(scale: number): void; // 时间缩放

  // === 数据契约（必须，供 TransportBridge 同步到布局）===
  getTransportState?(): TransportState; // { isPlaying: boolean, speed: number }
  getReadoutItems?(): ReadoutItem[]; // { label, value }[]
  subscribe?(listener: () => void): () => void; // 单监听器，状态变化时通知

  // === 状态持久化（可选）===
  getState?(): unknown;
}
```

### 4.1 关键注意事项

**`getTransportState()` 禁止硬编码 `isPlaying: false`**

错误示例：

```typescript
getTransportState() {
  return { isPlaying: false, speed: 1 };  // ❌ 永远显示暂停
}
```

正确示例：

```typescript
getTransportState() {
  return { isPlaying: this.isRunning, speed: this.timeScale };
}
```

**`subscribe()` 使用单监听器模式**

```typescript
let _listener: (() => void) | null = null;

return {
  subscribe(listener: () => void) {
    _listener = listener;
    return () => {
      _listener = null;
    };
  }
  // 内部状态变化时调用 _listener?.()
};
```

**`dispose()` 必须清理所有副作用**

```typescript
dispose() {
  cancelAnimationFrame(this.rafId);
  this.canvas.removeEventListener('pointerdown', this.onPointerDown);
  // 清理所有事件监听、定时器、RAF
}
```

---

## 五、控制面板约定（controls-v4.ts）

### 5.1 标准结构

控制面板使用卡片分组，每卡片包含相关参数：

```typescript
export function createMyControlsV4(opts: {
  mount: HTMLElement;
  onParamChange: (key: string, value: number) => void;
  onPresetSelect: (preset: string) => void;
}) {
  // 1. 创建容器
  const container = document.createElement('div');
  container.className = 'control-panel';

  // 2. 创建参数卡片
  const paramCard = createControlCard({ title: '参数设置', mount: container });
  createSlider({
    mount: paramCard,
    label: '初速度 v₀',
    min: 0,
    max: 100,
    step: 1,
    value: 30,
    onChange: (v) => opts.onParamChange('v0', v)
  });

  // 3. 创建预设卡片
  const presetCard = createControlCard({ title: '环境预设', mount: container });
  createPresetButtons({
    mount: presetCard,
    presets: [
      { id: 'earth', label: '地球 g=9.8' },
      { id: 'moon', label: '月球 g=1.62' }
    ],
    onSelect: opts.onPresetSelect
  });

  opts.mount.appendChild(container);

  return {
    updatePreset: (preset: string) => {
      /* 更新预设按钮高亮 */
    },
    dispose: () => container.remove()
  };
}
```

### 5.2 控件类型标准

| 控件   | 组件函数              | 必须属性                               |
| ------ | --------------------- | -------------------------------------- |
| 滑块   | `createSlider`        | min, max, step, value, label, onChange |
| 按钮   | `createButton`        | label, onClick, variant                |
| 预设   | `createPresetButtons` | presets[], onSelect                    |
| 复选框 | `createCheckbox`      | label, checked, onChange               |
| 下拉   | `createSelect`        | options[], value, onChange             |

所有控件必须响应 `data-theme="dark"` 属性。

---

## 六、仿真层约定（scene.sim.ts）

### 6.1 纯计算原则

`scene.sim.ts` **严禁**导入任何 DOM 相关模块：

```typescript
// ✅ 正确：纯数学计算
import { Vec2 } from '../../core/vector';

export function createProjectileSim(params: ProjectileParams) {
  let state = initState(params);

  return {
    step(dt: number) {
      state = integrate(state, dt);
    },
    reset() {
      state = initState(params);
    },
    getSnapshot() {
      return { state, params };
    }
  };
}

// ❌ 错误：导入 DOM
import { sizeCanvasToFill } from '../../core/canvas-sizing'; // 禁止！
```

### 6.2 状态快照模式

仿真必须提供 `getSnapshot()` 返回不可变快照，视图层只读取快照：

```typescript
interface ProjectileSnapshot {
  state: {
    pos: Vec2;
    vel: Vec2;
    time: number;
  };
  params: ProjectileParams;
}
```

---

## 七、视图层约定（scene.view.ts）

### 7.1 接收快照，绘制帧

```typescript
export function createProjectileView(opts: {
  canvas: HTMLCanvasElement;
  theme: Theme;
}) {
  const ctx = opts.canvas.getContext('2d')!;

  return {
    render(snapshot: ProjectileSnapshot) {
      const { width, height } = opts.canvas;
      ctx.clearRect(0, 0, width, height);

      // 绘制背景网格
      drawGrid(ctx, width, height, opts.theme);

      // 绘制轨迹
      drawTrajectory(ctx, snapshot.state);

      // 绘制当前位置
      drawProjectile(ctx, snapshot.state.pos);
    }
  };
}
```

### 7.2 高 DPI 处理

必须使用 `canvas-sizing` 工具处理 `devicePixelRatio`（原 `high-dpi-canvas.ts`
已删除，功能并入 `canvas-sizing.ts`）：

```typescript
import { sizeCanvasToFill } from '../../core/canvas-sizing';

// 在 scene.view.ts 的 resize 中调用，内部处理 DPR 并设置 responsiveScale
sizeCanvasToFill(canvas);
```

---

## 八、测试要求

### 8.1 新增场景最低测试覆盖

| 测试   | 文件                                     | 要求                                     |
| ------ | ---------------------------------------- | ---------------------------------------- |
| Unit   | `tests/unit/<scene-id>.spec.ts`          | 仿真数值正确性（如抛体运动轨迹公式验证） |
| E2E    | `tests/e2e/`（追加到现有 spec）          | 页面加载 + 至少 1 个控件响应验证         |
| Visual | `tests/visual/<scene-id>.visual.spec.ts` | 可选但推荐：初始状态截图                 |

### 8.2 E2E 测试模板

```typescript
// tests/e2e/scene-interactions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('MyScene', () => {
  test('loads with correct structure', async ({ page }) => {
    await page.goto('/src/pages/my-scene.html');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('[data-region="control"]')).toBeVisible();
  });

  test('slider changes parameter', async ({ page }) => {
    await page.goto('/src/pages/my-scene.html');
    const slider = page.locator('input[type="range"]').first();
    await slider.fill('50');
    // 验证读数或画布变化
  });
});
```

---

## 九、质量门禁

提交前必须全绿：

```bash
pnpm generate:index
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

---

## 十、参考实现

最规范的参考场景：

| 场景                | 推荐理由                                    |
| ------------------- | ------------------------------------------- |
| `projectile`        | page.ts 最简洁， controls-v4.ts 结构清晰    |
| `spring-oscillator` | 复杂控制面板（多体系统），读数面板格式丰富  |
| `emf-analogy`       | RAF 控制正确（start/stop 模式），状态机清晰 |
