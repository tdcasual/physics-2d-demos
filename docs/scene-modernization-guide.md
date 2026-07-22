# 场景现代化指南

> 面向：要把早期「落后」场景重写/升级，或新增场景的开发者。
> 本文与 [scene-migration-requirements.md](scene-migration-requirements.md)（新场景开发规范）互补：
> 那份讲「契约与文件结构」，本文讲「如何把一个场景做到当前标准、如何安全地重写、有哪些可复用基建」。

布局母版系统已稳定，场景会持续演进。本指南的目标是让**每个新增或重写的场景都达到统一的「当前标准」**，并且这个标准只升不降。

---

## 1. 当前场景标准（由测试强制）

标准不是口头约定，而是 `tests/contract/scene-standard.spec.ts` 里的**防漂移棘轮**：

| 标准         | 约束                                                                                                          | 强制方式                   |
| ------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 响应式缩放   | 渲染代码必须经由 core 响应式机制（`responsiveScale` / `getResponsiveScale` / `scaledSize` / `sizeCanvasTo*`） | 全员强制，不满足则 CI 失败 |
| 演示模式机制 | 应采用 `getRenderTokens` / `getTeachingStandards` / `demoHints` 实现 presentation 缩放                        | 棘轮豁免（见下）           |

**演示模式豁免清单**：尚未改造的历史场景列在 `scene-standard.spec.ts` 的 `PRESENTATION_EXEMPT` 中。该清单**只能缩小**——当你完成某场景的 presentation 改造后，把它从清单删除；若它已采用标准机制却仍在清单里，测试会失败提醒你删除。这份清单就是演示模式现代化的待办路线图。

> 用脚手架 `pnpm new:scene` 生成的场景**天然满足以上两项标准**。

---

## 2. 标准场景结构与数据流

每个场景是一个自包含目录（自动发现，无需注册）：

```
src/scenes/<id>/
  scene.meta.ts        # SceneMeta：id/title/path/keywords/objective/defaultParams/demoProfile
  scene.sim.ts         # 纯物理逻辑，零 DOM 依赖（最易测试）
  scene.view.ts        # Canvas 渲染（可再拆 renderer/draw-*.ts）
  scene.entry.ts       # 组装 sim + view，套用 createStandardSceneEntry
  controls-schema.ts   # 声明式控制面板（推荐）；复杂动态场景可用 controls.ts
  page.ts              # bootScenePage(...) 唯一入口
src/pages/<id>.html    # Vite 自动扫描的页面入口
```

**运行时数据流**（你只需关心 sim/view/entry，其余由框架处理）：

```
bootScenePage(options)
  └─ SceneAdapter.renderAnimation(container, slots)
       ├─ createScene({ canvas, slots, theme, mode, demoHints })  ← 你的 entry
       │     └─ createStandardSceneEntry({ sim, view, getState })
       ├─ createSceneShell  → 固定步长循环：onStep(dt)=scene.step(dt)、onRender=scene.render()
       └─ scene.subscribe(...) → 读数面板/运输控制条自动刷新
```

`scene.render()` 里 `view.render(sim.getState())` 后调用 `notify()`，读数面板随之刷新。**物理（sim）与渲染（view）彻底解耦**——现代化时通常只需重写 view，sim 可保留并继续被单测覆盖。

---

## 3. 可复用 core 基建（现代化时直接用，别自己造）

| 模块                                                     | 用途                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `core/fixed-step.ts`                                     | 固定步长步进器（框架已用，场景一般无需直接用）                                                                |
| `core/canvas-sizing.ts`                                  | **响应式缩放核心**：`sizeCanvasToFill/Fit`、`getResponsiveScale`、`scaledSize`                                |
| `core/high-dpi-canvas.ts`                                | 高 DPI 适配                                                                                                   |
| `core/standards.ts`                                      | **演示模式渲染 token**：`getRenderTokens(scale)` → `{ bodyFontPx, strokePx, pointRadiusPx, rightStage{...} }` |
| `core/chart/`                                            | 折线图等图表组件（含主题）                                                                                    |
| `core/colors.ts` / `spectral-color.ts` / `wavelength.ts` | 配色 / 光谱色 / 波长工具                                                                                      |
| `core/draw-primitives.ts`                                | 绘制基元                                                                                                      |
| `scenes/scene-entry-helpers.ts`                          | `createStandardSceneEntry`（统一生命周期 + subscribe/notify）                                                 |
| `scenes/page-utils.ts`                                   | `createParamMapper` / `createPresetApplier`（控制面板 → 参数映射）                                            |

---

## 4. 响应式缩放规范（第一铁律）

**禁止裸写固定像素**定义元素尺寸，否则移动端会过大/过小。统一做法：

```ts
import { sizeCanvasToFill } from '../../core/canvas-sizing';

function resize() {
  ctx = sizeCanvasToFill(canvas); // 自动设置 canvas.dataset.responsiveScale
  const rect = canvas.getBoundingClientRect();
  width = Math.floor(rect.width);
  height = Math.floor(rect.height);
  responsiveScale = parseFloat(canvas.dataset.responsiveScale || '1');
}

// 绘制时所有尺寸乘以 responsiveScale
ctx.arc(x, y, 20 * responsiveScale, 0, Math.PI * 2);
const fontSize = scaledSize(28, responsiveScale, 12); // 带最小值保护
```

`getResponsiveScale(w, h, ref?)` 基于短边比例，clamp 到 `[0.3, 1.5]`（桌面≈0.8–1.0，移动≈0.3–0.5）。

---

## 5. 演示模式（presentation）

演示模式面向 1080P 投影，统一放大字号/线宽/关键点。标准实现：

1. **meta 声明 `demoProfile`**（场景想要什么）：

   ```ts
   const demoProfile: SceneDemoProfile = {
     controlPanel: 'minimal',
     readoutPanel: 'overlay',
     renderHints: { contentScale: 1.5 }, // 内容放大倍率
     interactionHints: { touchTargetMinSize: 48 }
   };
   ```

2. **view 在 `setMode` 中消费 `demoHints` 并缩放 token**（场景怎么画）：

   ```ts
   import { getRenderTokens } from '../../platform/standards';

   function render(state) {
     const scale = mode === 'presentation' ? (hints?.contentScale ?? 1.5) : 1;
     const tokens = getRenderTokens(scale);
     ctx.arc(x, y, tokens.pointRadiusPx * responsiveScale, 0, Math.PI * 2);
     ctx.font =
       tokens.rightStage.primaryFontPx * responsiveScale + 'px sans-serif';
   }
   function setMode(m, h) {
     mode = m;
     hints = h;
   } // 框架在切换 presentation 时传入 hints
   ```

`createStandardSceneEntry` 已把 `setMode(mode, hints)` → `view.setMode(mode, hints)` 接好，你只需在 view 里实现。

---

## 6. 声明式控制面板

优先用 `controls-schema.ts` 描述面板，`page.ts` 用 `renderSchema` 渲染：

```ts
// controls-schema.ts —— 字段类型：slider/number/text/select/button/toggle/
//   preset-group/transport/scene-selector/button-grid/custom
export const myControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
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
```

```ts
// page.ts
createControls: ({ mount, scene }) => {
  const renderer = renderSchema({
    mount,
    schema: myControlsSchema,
    onChange: (key, value) => scene.setParams({ [key]: value }),
    onAction: () => {}
  });
  return { dispose: () => renderer.dispose() };
};
```

含 slider/text 的 section 自动占满整行；纯按钮/预设的 section 参与多列自适应。键名映射可用 `createParamMapper`（控制键 → sim 参数键），预设用 `createPresetApplier`。

---

## 7. URL 参数同步约定（含历史教训）

`url-sync` 用 **`Object.keys(meta.defaultParams)` ∪ `urlSyncKeys` ∪ `preset`** 作为可同步的 URL 键。
读取（`readSceneParams`）按这些键，写入（`writeSceneParams`）用**控制面板的字段键**。

> **教训（projectile）**：曾经 meta 用 `angle`、控件用 `theta`，导致「写 theta、读 angle」，抛射角/初始高度/阻力的 URL 分享与恢复全部失效。**务必让 `meta.defaultParams` 的键与控制面板字段键一致**，URL 往返才正确。

---

## 8. 现代化重写的安全流程

重写老场景（尤其是换绘制方式）时，用以下流程保证行为不退化：

1. **保留 sim**：物理逻辑通常是对的且有单测，尽量只重写 view。
2. **写/补 parity 测试**：`tests/parity/` 用于对比新旧实现的一致性（像素或关键数值）。重写前先确认老行为基线，重写后断言一致。
3. **补/更新单测**：`tests/unit/<id>.sim.spec.ts`（数值/状态）、`<id>.renderer.spec.ts`（渲染）。
4. **过质量门禁**：

   ```bash
   pnpm quality:core    # 快速：check:scenes + circular + lint + typecheck + test + build + bundle
   pnpm quality:full    # 完整：再 + coverage + e2e + visual
   ```

5. **视觉确认**：涉及样式/布局时跑 `pnpm test:visual`（必要时 `test:visual:update` 更新基线），或 `pnpm dev` 肉眼核对桌面/移动两套断点。
6. **若完成了 presentation 改造**：把该场景从 `scene-standard.spec.ts` 的 `PRESENTATION_EXEMPT` 删除（测试会强制提醒你）。

---

## 9. 用脚手架开始

```bash
pnpm new:scene <id> [标题]     # 例：pnpm new:scene pendulum 单摆
```

生成符合当前标准的骨架（含 sim 测试），自动通过 `check:scenes` / 运行时契约 / `scene-standard`。随后只需：

1. `scene.sim.ts` 实现物理；
2. `scene.view.ts` 实现绘制（**保留响应式缩放与演示模式机制**）；
3. 完善 `scene.meta.ts` 的 concept / keywords / objective / defaultParams；
4. 调整 `controls-schema.ts`；
5. `pnpm quality:core` 验收。

---

## 10. 渲染技术选型

- **当前标准是 Canvas 2D**，全部 core 基建（canvas-sizing / high-dpi / chart / getRenderTokens）都围绕它。在 Canvas 2D 内重写（更精致的绘制、更流畅的动画）**零摩擦**，直接用上述基建。
- **WebGL/WebGPU**：仍使用 `<canvas>` 元素，契约兼容；但 2D 辅助函数（`getContext('2d')`、DPR 缩放）不适用，需自管 resize/DPR。布局已有 `preservedCanvas`（防 context 丢失）可复用。
- **SVG / CSS / DOM / Lottie 等非 canvas 技术**：当前 `createScene` 契约与 `SceneAdapter` 假设动画区是 `<canvas>`（`querySelector('canvas')`），非 canvas 渲染会与之冲突。**若计划引入这类技术，需先把「渲染面」从 canvas 解耦**（让 `createScene` 接收渲染容器而非 canvas，并放宽适配器的 canvas 硬假设）——这是一次架构调整，建议确定技术方向后再做。

---

## 11. 提交前检查清单

- [ ] `scene.view.ts` 无大于 50 的裸数字用于元素尺寸，统一乘 `responsiveScale`
- [ ] 实现了 `setMode` 的 presentation 缩放（`getRenderTokens` / `demoHints`），或确认仍在豁免清单
- [ ] `meta.defaultParams` 键与控制面板字段键一致（URL 往返正确）
- [ ] 主题切换（light/dark）下渲染正常
- [ ] 单测（sim + renderer）与 parity 测试通过
- [ ] `pnpm quality:core` 全绿；涉及视觉时 `pnpm test:visual` 通过
- [ ] 移动端截图无元素遮挡/过度拥挤
