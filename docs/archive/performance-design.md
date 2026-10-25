# 性能设计方案

> **⚠️ 历史草案**。文中「零性能测试 / 无 code splitting」已过时
> （现有 `PerformanceMonitor`、`registerLazyLayout`、场景分 chunk）。
> 禁止按本文评分提 PR。现行瓶颈见
> [`docs/plans/2026-09-08-wave6-current-bottlenecks.md`](plans/2026-09-08-wave6-current-bottlenecks.md)
> 与 `scripts/check-bundle-budget.ts`。

## 现状评分（2026-04 历史）：6.0 / 10

### 问题清单（历史）

1. 零性能测试（无 FPS、内存、重绘监控）— 历史；现有 PerformanceMonitor
2. chase-meet 3 个 canvas 同时 requestAnimationFrame 重绘
3. emf-analogy 160 个 particle 每帧重新计算位置
4. 无 code splitting / lazy loading — 历史；现已分 vendor/layouts/scene chunks
5. 无 PerformanceObserver 或 requestIdleCallback 优化

## 设计目标

- 动画场景维持 ≥ 55 FPS（低端机 ≥ 30 FPS）
- 静态场景无 idle 重绘
- Bundle 按需加载，首屏 < 200KB
- 内存无泄漏（dispose 后完全释放）

---

## 方案一：性能监控基础设施

### 设计

新建 `src/core/performance-monitor.ts`：

```typescript
export type PerformanceMetrics = {
  fps: number;
  frameTime: number;
  memoryMB?: number;
};

export class PerformanceMonitor {
  private frames: number[] = [];
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const delta = now - this.lastTime;
    this.frames.push(delta);
    if (this.frames.length > 60) this.frames.shift();
    this.lastTime = now;
    this.rafId = requestAnimationFrame(this.loop);
  };

  getMetrics(): PerformanceMetrics {
    const avgDelta =
      this.frames.reduce((a, b) => a + b, 0) / (this.frames.length || 1);
    return {
      fps: 1000 / avgDelta,
      frameTime: avgDelta,
      memoryMB: (performance as any).memory
        ? (performance as any).memory.usedJSHeapSize / 1024 / 1024
        : undefined
    };
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.frames = [];
  }
}
```

### Playwright 性能测试

```typescript
test('projectile maintains FPS above 30', async ({ page }) => {
  await page.goto(...);
  await page.click('.play-pause');
  await page.waitForTimeout(3000);
  const metrics = await page.evaluate(() =>
    (window as any).__perfMonitor?.getMetrics()
  );
  expect(metrics.fps).toBeGreaterThan(30);
});
```

### 实施成本：低（1 小时）

---

## 方案二：Canvas 重绘节流

### 设计

新建 `src/core/render-loop.ts`：

```typescript
export class ThrottledRenderLoop {
  private rafId = 0;
  private needsRender = false;
  private running = false;

  constructor(private renderFn: () => void) {}

  request(): void {
    this.needsRender = true;
    if (!this.running) {
      this.running = true;
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  private loop = (): void => {
    if (this.needsRender) {
      this.renderFn();
      this.needsRender = false;
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
```

### 应用场景

- **动画场景**（projectile/chase-meet/emf-analogy）：使用 `ThrottledRenderLoop`，动画运行时持续 loop，暂停时 `stop()`
- **静态场景**（vt-integral/field-lines/electrification）：仅在参数变化时 `requestRender()`，无 idle loop

### 实施成本：中（2-3 小时，需修改 6 个 scene.view.ts）

---

## 方案三：场景按需加载（Code Splitting）

### 设计

修改 `src/catalog/scene-registry.ts`（或等效文件），使用动态 import：

```typescript
const sceneModules: Record<string, () => Promise<{ meta: SceneMeta }>> = {
  'chase-meet': () => import('../scenes/chase-meet/scene.meta'),
  projectile: () => import('../scenes/projectile/scene.meta')
  // ...
};

export async function loadSceneMeta(id: string): Promise<SceneMeta> {
  const module = await sceneModules[id]();
  return module.meta;
}
```

### 预期效果

- 首屏只加载 `main.js` + `vendor.js` + `layouts.js`（~216KB）
- 进入具体场景时再加载对应 chunk（~5-18KB）

### 实施成本：中（2 小时，需验证路由切换）

---

## 方案四：粒子系统对象池优化

### 设计

emf-analogy 当前每帧创建/销毁粒子对象。改为对象池：

```typescript
class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];

  acquire(): Particle {
    return this.pool.pop() || this.createParticle();
  }

  release(p: Particle): void {
    this.pool.push(p);
  }

  reset(): void {
    this.pool.push(...this.active);
    this.active = [];
  }
}
```

同时添加**脏矩形检测**：只重绘粒子移动的区域，而非整个 canvas。

### 实施成本：中（2 小时，仅限 emf-analogy）

---

## 实施优先级

1. P0：性能监控基础设施（1 小时，全局受益）
2. P1：Canvas 重绘节流（2-3 小时，显著降低 CPU）
3. P2：场景按需加载（2 小时，优化首屏）
4. P3：粒子对象池（2 小时，仅限 emf-analogy）
