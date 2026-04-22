# 可访问性（a11y）设计方案

## 现状评分：5.0 / 10

### 问题清单

1. 5/6 场景的 canvas 无 ARIA 属性（仅 chase-meet 有）
2. 无颜色对比度自动化检查
3. 无键盘快捷键（Space播放、R重置等）
4. 无屏幕阅读器替代文本
5. 色盲用户可能无法区分 A（蓝）和 B（红）

## 设计目标

- 所有 canvas 具备 `role="img"` + `aria-label`
- WCAG 2.1 AA 颜色对比度 ≥ 4.5:1
- 全局键盘快捷键覆盖核心操作
- 自动化 a11y 测试纳入 CI

---

## 方案一：统一 Canvas ARIA 基础设施

### 设计

在 `canvas-sizing.ts` 的 `applyCanvasSize` 中增加可选 `ariaLabel` 参数：

```typescript
export function applyCanvasSize(
  canvas: HTMLCanvasElement,
  sizing: CanvasSizingResult,
  options?: { ariaLabel?: string }
): CanvasRenderingContext2D {
  // ... existing sizing logic ...
  if (options?.ariaLabel) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', options.ariaLabel);
  }
  // ...
}
```

同时修改 `sizeCanvasToFill` / `sizeCanvasToFit` 透传 `options`。

### 各场景 aria-label 规范

| 场景            | canvas 描述                  |
| --------------- | ---------------------------- |
| chase-meet      | "空间位置动画：A/B 一维追及" |
| projectile      | "抛体运动轨迹图"             |
| emf-analogy     | "电路水流类比演示图"         |
| field-lines     | "电场线分布图"               |
| electrification | "摩擦起电演示图"             |
| vt-integral     | "微元法积分演示图"           |

### 实施成本：低（1 小时）

---

## 方案二：键盘快捷键系统

### 设计

新建 `src/platform/input/keyboard-shortcuts.ts`：

```typescript
export class KeyboardShortcutManager {
  private shortcuts = new Map<string, () => void>();
  private enabled = false;

  register(key: string, handler: () => void): void {
    this.shortcuts.set(key.toLowerCase(), handler);
  }

  init(): void {
    if (this.enabled) return;
    document.addEventListener('keydown', this.onKeyDown);
    this.enabled = true;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.isTypingInInput(e)) return;
    const handler = this.shortcuts.get(e.key.toLowerCase());
    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  private isTypingInInput(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.enabled = false;
  }
}
```

### 全局快捷键映射

| 按键  | 动作          | 场景                                    |
| ----- | ------------- | --------------------------------------- |
| Space | 播放 / 暂停   | 全部                                    |
| R     | 重置          | 全部                                    |
| T     | 切换主题      | 全部                                    |
| + / = | 增加速度      | 全部                                    |
| -     | 降低速度      | 全部                                    |
| 1-6   | 切换子场景    | emf-analogy / vt-integral / field-lines |
| ← / → | 单步前进/后退 | 全部                                    |

### 集成点

在 `scene-bootstrapper.ts` 的 `bootScenePage` 中统一初始化：

```typescript
const keyboard = new KeyboardShortcutManager();
keyboard.register(' ', () => scene.step?.(0.016) || scene.startAll?.());
keyboard.register('r', () => scene.reset?.());
keyboard.init();
```

### 实施成本：中（2-3 小时）

---

## 方案三：颜色对比度自动化检查

### 设计

引入 `@axe-core/playwright`：

```bash
pnpm add -D @axe-core/playwright
```

测试文件 `tests/visual/a11y-contrast.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const scene of SCENES) {
  test(`color contrast: ${scene}`, async ({ page }) => {
    await page.goto(...);
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

### 实施成本：低（30 分钟）

---

## 实施优先级

1. P0：统一 Canvas ARIA（1 小时，影响全部 6 场景）
2. P1：键盘快捷键（2-3 小时，影响全部 6 场景）
3. P2：对比度检查（30 分钟，纯测试新增）
