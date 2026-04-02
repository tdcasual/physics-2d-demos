# CSS 架构规范

## 核心原则

1. **单一职责**: 每个CSS文件只负责一个明确的职责
2. **分层管理**: 按层级组织，下层不依赖上层
3. **无重复定义**: 每个变量只定义一次
4. **显式依赖**: 通过CSS @import 显式声明依赖关系

## 架构层级

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: 组件层 (Components)                                │
│  - teaching-demo-v2.css                                     │
│  - teaching-demo-controls.css                               │
│  - 只包含组件特定样式，不定义CSS变量                          │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ @import
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: 主题层 (Themes)                                    │
│  - themes.css                                               │
│  - 定义深色/浅色模式的CSS变量映射                              │
│  - 仅此文件定义[data-theme]选择器                             │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ @import
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: 设计令牌 (Design Tokens)                           │
│  - design-tokens.css                                        │
│  - 定义原始值（颜色、间距、字体等）                            │
│  - 不定义CSS变量，只定义CSS自定义属性                          │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ @import
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: 基础层 (Base)                                      │
│  - reset/normalize                                          │
│  - 字体加载                                                  │
└─────────────────────────────────────────────────────────────┘
```

## 文件职责

### design-tokens.css
- **职责**: 定义设计系统的原始值
- **内容**: 颜色、间距、字体、圆角、阴影等基础值
- **规则**: 
  - 使用CSS自定义属性 (--token-*)
  - 不定义[data-theme]选择器
  - 值是原始值，不随主题变化

### themes.css
- **职责**: 定义主题变量映射
- **内容**: 
  - `[data-theme="dark"]` 深色主题变量
  - `[data-theme="light"]` 浅色主题变量
- **规则**:
  - 仅此文件定义主题选择器
  - 将设计令牌映射到语义化变量 (--bg-primary, --text-primary等)
  - 变量命名遵循语义化规范

### 组件文件 (teaching-demo-v2.css, teaching-demo-controls.css)
- **职责**: 组件特定样式
- **规则**:
  - 只使用主题变量，不直接使用设计令牌
  - 不定义任何CSS变量
  - 通过 @import 引入主题层

## 变量命名规范

### 设计令牌 (design-tokens.css)
```css
--token-color-coral: #FF6B6B;
--token-color-mint: #4ECDC4;
--token-space-4: 1rem;
--token-font-size-sm: 0.875rem;
```

### 主题变量 (themes.css)
```css
/* 背景 */
--bg-primary: ...;      /* 主背景 */
--bg-secondary: ...;    /* 次级背景 */
--bg-tertiary: ...;     /* 三级背景 */
--bg-hover: ...;        /* 悬停背景 */

/* 文字 */
--text-primary: ...;    /* 主文字 */
--text-secondary: ...;  /* 次级文字 */
--text-tertiary: ...;   /* 三级文字 */
--text-muted: ...;      /* 弱化文字 */

/* 边框 */
--border-color: ...;    /* 边框颜色 */
--border-width: ...;    /* 边框宽度 */

/* 强调色 */
--accent-color: ...;    /* 主强调色 */
--primary-color: ...;   /* 主色 */
--secondary-color: ...; /* 辅色 */

/* 组件特定 */
--card-bg: ...;
--card-header-bg: ...;
--btn-bg: ...;
--btn-hover-bg: ...;
--input-bg: ...;
--sidebar-bg: ...;
--stage-bg: ...;
```

## 依赖规则

1. **下层不依赖上层**: design-tokens.css 不导入任何文件
2. **上层显式导入**: 组件文件必须显式导入 themes.css
3. **禁止循环依赖**: A导入B，则B不能导入A
4. **禁止重复导入**: 每个文件只导入一次

## 重构步骤

1. 备份现有CSS文件
2. 重构 design-tokens.css - 提取所有原始值
3. 重构 themes.css - 统一定义所有主题变量
4. 重构 teaching-demo-v2.css - 移除变量定义，只保留组件样式
5. 重构 teaching-demo-controls.css - 移除变量定义，只保留组件样式
6. 更新组件文件导入关系
7. 测试所有场景

## 常见错误

❌ **不要这样做**:
```css
/* 在组件文件中定义变量 */
.teaching-demo {
  --bg-primary: #0f172a;  /* 错误！ */
}

/* 重复定义主题 */
[data-theme="dark"] {
  --text-primary: #fff;  /* 错误！已在themes.css定义 */
}

/* 跨层引用 */
.teaching-demo {
  color: var(--token-color-coral);  /* 错误！应使用 --accent-color */
}
```

✅ **正确做法**:
```css
/* 只使用主题变量 */
.teaching-demo {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```
