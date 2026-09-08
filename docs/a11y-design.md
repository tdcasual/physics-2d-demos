# 可访问性（a11y）设计方案 —— 落地状态对照

> 2026-08 更新：本文档原为设计稿（评分 5.0/10 时代的三个方案），方案一至三已随
> 可访问性整改落地，且实现方式与原设计有出入。本文改为「设计 → 实现」对照；
> 历史设计细节可从 git 历史查阅。

## 落地状态总览

| 设计项                       | 状态      | 实现位置                                                                        |
| ---------------------------- | --------- | ------------------------------------------------------------------------------- |
| 方案一：统一 Canvas ARIA     | ✅ 已落地 | `src/app/scene-adapter.ts`                                                      |
| 方案二：键盘快捷键           | ✅ 已落地 | `src/platform/input/keyboard-shortcuts.ts`、`src/ui/components/KeyboardHelp.ts` |
| 方案三：axe 自动化检查       | ✅ 已落地 | `tests/visual/a11y-audit.spec.ts`                                               |
| 色盲友好 A/B 配色区分        | ❌ 未落地 | —                                                                               |
| 动画内容的屏幕阅读器文字替代 | ❌ 未落地 | —                                                                               |

## 方案一：Canvas ARIA —— 已落地（实现路径不同）

原设计是在 `canvas-sizing.ts` 的 `applyCanvasSize` 增加 `ariaLabel` 参数，由各场景
透传。**实际实现**改为在场景适配器统一注入，各场景零改动即覆盖：

- `src/app/scene-adapter.ts`：主 canvas 设置 `role="img"` +
  `aria-label="${meta.title}演示图"`；无 canvas 的渲染面容器设置
  `role="img"` + `aria-label="${meta.title}演示区"`。
- 多 canvas 场景按插入顺序编号（`...演示图 2`）；`MutationObserver` 为后插入的
  canvas（如图表插槽 `attachGraphCanvas`）补 `role`/`aria-label`。
- 断言：`tests/visual/a11y-audit.spec.ts` 的 `aria labels: <scene>` 用例遍历
  全部场景页，要求每个 canvas 有可访问名称。

原设计中的「各场景 aria-label 文案表」未采用——统一由 `meta.title` 派生。

## 方案二：键盘快捷键 —— 已落地

- `src/platform/input/keyboard-shortcuts.ts`：`KeyboardShortcutManager`
  （`register` / `registerMultiple`，输入框聚焦时自动忽略）。
- 在 `src/app/scene-adapter.ts` 统一初始化，全局可用。
- `src/ui/components/KeyboardHelp.ts`：`?` 键帮助浮层。

实际快捷键表（以 `KeyboardHelp.ts` 的 `SHORTCUTS` 为准）：

| 按键  | 动作                    |
| ----- | ----------------------- |
| Space | 播放 / 暂停             |
| R     | 重置场景                |
| T     | 切换主题                |
| ← / → | 单步后退 / 前进         |
| A / D | 减慢 / 加快速度         |
| F     | 切换全屏                |
| L     | 切换布局                |
| ?     | 显示快捷键帮助          |
| Esc   | 关闭帮助 / 退出演示模式 |

与原设计的差异：`+/-` 调速改为 `A/D`；`1-6` 切换子场景未实现（子场景切换
仍走控制面板的场景选择器）。

## 方案三：axe 自动化检查 —— 已落地（范围超出原设计）

`@axe-core/playwright` 已接入。`tests/visual/a11y-audit.spec.ts`：

- 覆盖 **全部场景页 + 首页 + instruments 页**（原设计仅计划场景页对比度）。
- 规则集为 `wcag2a` + `wcag2aa` 全量（含 `color-contrast`、`label`、
  `button-name` 等），critical/serious 违规必须为零。
- 另含键盘导航用例：Tab 可达多个控件、焦点指示器（outline/box-shadow）可见。

## 额外落地项（超出原三方案）

- **slider 可访问名称与命中区**：`label htmlFor` 关联
  （`src/ui/components/scene-controls/slider-row.ts`）；thumb/轨道命中区样式
  见 `src/styles/shared/scene-controls.css`。
- **toggle**：`role="switch"` + `aria-checked` + `aria-labelledby`
  （`src/ui/components/scene-controls/toggle-row.ts`）；36×20 的视觉开关通过
  CSS 把命中区扩到 ≥44px（`scene-controls.css`）。
- **readout 滚动区可聚焦**：`tabindex="0"`
  （`src/app/layouts/capabilities/readout-panel.ts`），键盘可滚动读数面板。
- **分栏 resizer**：`role="separator"` + 动态 `aria-valuenow`
  （`src/app/layouts/capabilities/resizer.ts`，满足 axe `aria-required-attr` /
  WCAG 4.1.2）。

## 未落地项

- **色盲友好配色**：原问题清单第 5 条（A 蓝 / B 红难以区分）未专项处理，
  目前仅依赖明暗双主题的对比度合规。
- **动画的文字替代**：canvas 只有静态 `aria-label`，动画过程无 live region
  播报；读数面板（可聚焦滚动区）是目前唯一的文字替代渠道。
