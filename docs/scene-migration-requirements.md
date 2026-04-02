# 场景迁移到统一框架的要求规范

> 本文档定义将 legacy 或独立场景迁移到 `teaching-demo-shell` 统一框架的硬性要求。

## 一、迁移前提

### 1.1 何时需要迁移

- 场景使用独立的 HTML/CSS，未接入 `createTeachingDemoShell()`
- 场景存在自定义 Canvas 尺寸计算逻辑，未使用 `getOptimalCanvasSize()`
- 场景自行管理播放/暂停/重置/单步控制，未使用统一控件
- 场景需要支持 mobile/presentation 双模式适配

### 1.2 禁止迁移的场景

- 3D WebGL 场景（使用 Three.js 的独立渲染循环）
- 特殊布局场景（如双面板 spring-oscillator，需单独设计）

---

## 二、文件结构要求

迁移后的场景必须遵循以下文件结构：

```
src/scenes/<scene-id>/
├── scene.meta.ts          # 场景元数据（subject/concept/keywords）
├── scene.sim.ts           # 物理仿真（纯计算，无DOM操作）
├── scene.view.ts          # Canvas 渲染（使用 unified-canvas 工具）
├── scene.entry.ts         # 场景入口（实现 SceneEntry 接口）
├── controls.ts            # 控制面板组件（参数调节UI）
└── page.ts                # 页面入口（调用 createTeachingDemoShell）

src/pages/<scene-id>.html  # 页面HTML（Vite入口）
```

### 2.1 必须实现的文件

| 文件 | 必须实现 | 说明 |
|-----|---------|------|
| `scene.meta.ts` | ✅ | 导出 `ScenePlacardMeta` |
| `scene.sim.ts` | ✅ | 导出 `createSceneSim()`，返回 `{ init, reset, step, getState }` |
| `scene.view.ts` | ✅ | 导出 `createSceneView()`，使用 `unified-canvas` 绘制工具 |
| `scene.entry.ts` | ✅ | 导出 `createSceneEntry()`，实现 `SceneEntry` 接口 |
| `controls.ts` | ✅ | 导出控制面板构建函数 |
| `page.ts` | ✅ | 调用 `createTeachingDemoShell()` 组装页面 |

---

## 三、Shell 接入要求

### 3.1 page.ts 必须配置

```typescript
const shell = createTeachingDemoShell({
  mount: document.getElementById('app')!,
  title: '场景中文名',
  subtitle: 'Scene English Name',
  defaultMode: 'normal',
  hideHeader: true,       // 推荐使用：隐藏左侧标题区，更紧凑
  hideStatusCard: true,   // 推荐使用：隐藏状态卡片，简化布局
});
```

### 3.2 必须连接的生命周期

```typescript
// 1. 初始化时连接 shell
shell.onInit = (ctx) => {
  scene.init(ctx.width, ctx.height, ctx.isDark);
};

// 2. 播放控制连接
shell.onPlay = () => scene.play();
shell.onPause = () => scene.pause();
shell.onReset = () => scene.reset();
shell.onStep = () => scene.step(1/60);

// 3. 渲染循环连接
shell.onRender = (ctx) => {
  scene.render();
  return scene.getReadout();  // 返回数据读数对象
};

// 4. 主题切换连接
shell.onThemeChange = (isDark) => {
  scene.setTheme(isDark ? 'dark' : 'light');
};

// 5. 尺寸变化连接
shell.onResize = (width, height) => {
  scene.resize(width, height);
};
```

### 3.3 控制面板必须接入

```typescript
// 将控制面板插入 sidebar
const controlSlot = shell.sidebar.querySelector('.control-slot')!;
controlSlot.appendChild(buildControls(scene));
```

---

## 四、Canvas 绘制要求

### 4.1 必须使用统一工具

从 `@/core/unified-canvas` 导入：

```typescript
import {
  getOptimalCanvasSize,    // 计算最佳 Canvas 尺寸
  setCanvasSize,           // 设置高DPI Canvas 尺寸
  drawGrid,                // 绘制网格背景
  drawBall,                // 绘制带高光的小球
  drawTrail,               // 绘制发光轨迹
  drawVector,              // 绘制带箭头的矢量
  drawDataPanel,           // 绘制数据面板（可选，推荐使用 HTML overlay）
} from '@/core/unified-canvas';
```

### 4.2 尺寸计算规范

```typescript
// ✅ 正确：使用统一工具
const optimal = getOptimalCanvasSize(rect.width, rect.height, 40);
setCanvasSize(canvas, optimal.width, optimal.height);

// ❌ 错误：自行计算
const width = Math.max(320, Math.floor(rect.width || 1280));
const height = Math.max(220, Math.floor(rect.height || 720));
```

### 4.3 响应式绘制规范

```typescript
function drawAxes(): void {
  // 根据视口调整线宽
  ctx.lineWidth = window.innerWidth <= 900 ? 1 : 2;
  
  // 根据视口调整字体
  ctx.font = window.innerWidth <= 900 
    ? '10px Satoshi, sans-serif' 
    : '12px Satoshi, sans-serif';
  
  // 使用 dpr 调整绘制精度
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);
  // ... 绘制逻辑
  ctx.restore();
}
```

---

## 五、数据读数要求

### 5.1 必须提供的数据格式

```typescript
interface SceneReadout {
  [key: string]: {
    value: string | number;
    unit?: string;
  };
}

// 示例
return {
  time: { value: state.t.toFixed(2), unit: 's' },
  velocity: { value: v.toFixed(1), unit: 'm/s' },
  position: { value: `(${x.toFixed(1)}, ${y.toFixed(1)})`, unit: 'm' },
};
```

### 5.2 数据面板显示规则

- **Desktop (>900px)**: 8项数据使用 2×4 网格布局
- **Mobile (≤900px)**: 8项数据使用 4×2 网格布局，字号缩小至 10px/11px
- **超过8项**: 滚动显示或分组折叠

---

## 六、移动端适配要求

### 6.1 必须检测的断点

```typescript
const compactViewport = window.innerWidth <= 900;
```

### 6.2 移动端布局要求

| 元素 | Desktop | Mobile |
|-----|---------|--------|
| 侧边栏 | 固定 300px | 可折叠，默认收起 |
| Canvas | 自适应剩余空间 | 全屏宽度，高度自适应 |
| 数据面板 | 浮动右上角 | 底部抽屉式，可收起 |
| 字体基准 | 18px | 14px |
| 控制行高 | 48px | 40px |
| 按钮尺寸 | 48px | 40px |

### 6.3 触摸交互要求

- 按钮最小触摸区域 44×44px
- 滑块需要支持触摸拖动
- Canvas 交互（如拖拽）需要处理 touch 事件

---

## 七、测试要求

### 7.1 必须编写的测试

| 测试类型 | 文件路径 | 覆盖要求 |
|---------|---------|---------|
| 单元测试 | `tests/unit/<scene>.sim.spec.ts` | 仿真数值正确性 |
| 契约测试 | `tests/contract/scene-contract.spec.ts` | 接口合规性 |
| 视觉测试 | `tests/visual/<scene>.spec.ts` | 截图对比 |
| 移动端测试 | `tests/visual/mobile-<scene>.spec.ts` | 移动端布局 |

### 7.2 视觉测试必须通过

```typescript
// tests/visual/<scene>.spec.ts
import { test, expect } from '@playwright/test';

test('scene renders correctly', async ({ page }) => {
  await page.goto('/src/pages/<scene>.html');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot('scene-initial.png');
});

test('mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/src/pages/<scene>.html');
  await expect(page).toHaveScreenshot('scene-mobile.png');
});
```

---

## 八、质量门禁

迁移完成后必须通过以下检查：

```bash
# 1. 生成索引
pnpm generate:index

# 2. 代码检查
pnpm lint

# 3. 单元测试
pnpm test

# 4. 视觉回归测试
pnpm test:visual

# 5. 构建验证
pnpm build
```

全部通过后方可提交。

---

## 九、迁移检查清单

### 9.1 功能检查

- [ ] 页面加载正常，无控制台报错
- [ ] 播放/暂停/重置/单步按钮工作正常
- [ ] 参数调节实时生效
- [ ] 主题切换（春日/月夜）正常
- [ ] 窗口resize自适应正常
- [ ] 数据读数实时更新

### 9.2 视觉检查

- [ ] 网格背景显示正常
- [ ] 坐标轴标签清晰可读
- [ ] 小球/轨迹渲染正确
- [ ] 深色/浅色模式配色正确
- [ ] 数据面板布局整齐

### 9.3 移动端检查

- [ ] 390×844 视口布局正常
- [ ] 侧边栏折叠/展开正常
- [ ] 数据面板收起/展开正常
- [ ] 触摸交互响应正常
- [ ] 字体大小适中可读

---

## 十、参考实现

完整的迁移参考实现：

```
src/scenes/projectile/
```

关键文件对比：

| 文件 | 行数 | 说明 |
|-----|------|------|
| `page.ts` | ~30 | 简洁的 shell 组装 |
| `scene.view.ts` | ~175 | 使用 unified-canvas 工具 |
| `scene.entry.ts` | ~82 | 实现 SceneEntry 接口 |

---

## 附录：快速迁移模板

### page.ts 模板

```typescript
import { createTeachingDemoShell } from '@/app/teaching-demo-shell';
import { buildSceneControls } from './controls';
import { createSceneEntry } from './scene.entry';

const mount = document.getElementById('app');
if (!mount) throw new Error('Mount point not found');

const shell = createTeachingDemoShell({
  mount,
  title: '场景中文名',
  subtitle: 'Scene English Name',
  defaultMode: 'normal',
  hideHeader: true,
  hideStatusCard: true,
});

const scene = createSceneEntry();

// 连接生命周期
shell.onInit = (ctx) => scene.init(ctx.width, ctx.height, ctx.isDark);
shell.onPlay = () => scene.play();
shell.onPause = () => scene.pause();
shell.onReset = () => scene.reset();
shell.onStep = () => scene.step(1/60);
shell.onRender = () => {
  scene.render();
  return scene.getReadout();
};
shell.onThemeChange = (isDark) => scene.setTheme(isDark ? 'dark' : 'light');
shell.onResize = (w, h) => scene.resize(w, h);

// 插入控制面板
const controlSlot = shell.sidebar.querySelector('.control-slot');
if (controlSlot) {
  controlSlot.appendChild(buildSceneControls(scene));
}

// 启动
shell.init();
```
