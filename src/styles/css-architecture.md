# CSS 架构规范

## 文件结构

```
src/styles/
  index.css                    # 入口：@import 所有文件（cascade 顺序）
  global.css                   # 全局 reset / base
  design-tokens.css            # 设计令牌原始值
  layout-tokens.css            # 布局令牌
  themes.css                   # 主题变量映射
  base/
    theme.css                  # Tailwind 配置 + @theme + CSS 变量 + 暗色主题
  layout/
    split-right.css            # teaching 布局（grid、面板、控制区、图表、动画区）
    srgb.css                   # srgb 布局 + 底部图表
    mobile-stack.css           # mobile-stack 布局 + mobile readout
  capability/
    readout-panel.css          # 数据区浮动面板（teaching + srgb 已用 :is() 统一）
    buttons.css                # 通用 capability 按钮（兜底样式）
  shared/
    responsive-demo.css        # 响应式断点 + 演示模式
  scene/
    chase-modern.css           # chase-meet 场景样式（class 前缀隔离）
```

## 核心原则

1. **单一职责**: 每个 CSS 文件只负责一个明确的职责（布局 / capability / 场景）
2. **分层管理**: base → layout → capability/shared → scene，下层不依赖上层
3. **无重复定义**: 通用样式用 `:is()` 选择器合并前缀变体
4. **显式依赖**: 通过 CSS `@import` 在 `index.css` 中按 cascade 顺序导入

## 层级关系

```
┌──────────────────────────────────────────┐
│  scene/             场景 CSS              │
│  使用 class 前缀隔离，消费布局 CSS 变量     │
└──────────────────────────────────────────┘
                    ▲
┌──────────────────────────────────────────┐
│  capability/ + shared/  能力 + 共享样式   │
│  自包含，可被任意布局引用                  │
└──────────────────────────────────────────┘
                    ▲
┌──────────────────────────────────────────┐
│  layout/            布局结构样式           │
│  每个布局一个文件，定义 grid 和 slot       │
└──────────────────────────────────────────┘
                    ▲
┌──────────────────────────────────────────┐
│  base/              基础层                │
│  Tailwind 配置 + CSS 变量 + 主题          │
└──────────────────────────────────────────┘
```

## 场景 CSS 隔离约定

场景样式必须自隔离，避免污染其他场景或布局：

**规则:**
- 场景自建 CSS 文件，放在 `src/styles/scene/` 下
- 所有选择器使用场景专属 class 前缀（如 `.chase-modern-*`）
- 场景 CSS 不定义 CSS 变量，只消费布局层提供的变量（`--bg-card`、`--border-color`、`--text-primary` 等）
- 场景 page.ts 在文件顶部 `import '../../styles/scene/<name>.css'`

**示例 (chase-modern.css):**
```css
/* ✅ 正确：class 前缀隔离 */
.chase-modern-stage { ... }
.chase-modern-card { ... }
.chase-modern-card--motion { ... }

/* ✅ 正确：消费布局变量 */
.chase-modern-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

/* ❌ 错误：不要在场景 CSS 中定义变量 */
.chase-modern-card {
  --my-color: #ff0000;
}
```

## 添加新布局 CSS

1. 在 `src/styles/layout/` 下创建 `<layout-name>.css`
2. 在 `src/styles/index.css` 中按 cascade 顺序添加 `@import`
3. 布局 CSS 只定义 grid 结构、slot 定位，功能样式由 capability CSS 提供

## 添加新 capability CSS

1. 在 `src/styles/capability/` 下创建 `<capability-name>.css`
2. 如果 capability 被多个布局使用且样式完全相同，用 `:is()` 选择器合并前缀
3. 在 `index.css` 中添加 `@import`

## 变量命名规范

- 设计令牌: `--color-*`、`--shadow-*`、`--font-*`
- 语义变量: `--bg-*`、`--text-*`、`--border-*`、`--btn-*`、`--accent-*`
- 组件变量: `--<component>-<property>`

## 常见错误

❌ **不要这样做**:
- 在场景/布局 CSS 中定义新的 CSS 变量
- 使用过于宽泛的选择器（如 `button`、`div`）
- 在 capability CSS 中硬编码布局相关的尺寸

✅ **正确做法**:
- 场景 CSS 用 class 前缀隔离
- 布局 CSS 只定义 grid 结构
- 所有颜色/间距使用语义化 CSS 变量
