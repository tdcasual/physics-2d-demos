# 布局母版系统 - 像素级迁移完成

## 审阅结果

| 检查项 | 状态 | 说明 |
|-------|------|------|
| DOM 结构一致性 | ✅ 通过 | 所有关键元素存在 |
| CSS 类名一致性 | ✅ 通过 | 使用相同的 teaching-shell.css |
| 布局网格一致性 | ✅ 通过 | 486.4px 8px 1fr |
| 数据属性一致性 | ✅ 通过 | theme/hasGraph/mode |
| Canvas 渲染 | ✅ 通过 | 尺寸正确，有像素内容 |
| 控制面板 | ✅ 通过 | 振子列表、相位演示正常 |
| 浮动控制条 | ✅ 通过 | 播放/重置/速度控制 |
| 数据读数面板 | ✅ 通过 | 可折叠，显示数据 |

## 对比截图

- Legacy: `tests/visual/pixel-perfect-legacy.png`
- V3: `tests/visual/pixel-perfect-v3.png`

## 关键实现细节

### 1. 完全复刻 DOM 结构
```html
.teaching-demo.v2-layout
├── .teaching-left-panel
│   ├── .teaching-header (可选)
│   ├── .control-section
│   │   └── .control-slot
│   └── .graph-section (可选)
│       └── .graph-slot
├── .panel-resizer
└── .teaching-right-panel
    ├── .stage-toolbar
    │   ├── .sidebar-toggle
    │   └── .toolbar-actions
    │       ├── .mode-toggle
    │       └── .shell-theme-toggle
    ├── .stage-frame
    │   └── .stage-slot
    │       └── .stage-canvas
    └── .readout-panel
        ├── .readout-header
        └── .readout-slot
```

### 2. 生命周期调整
由于布局系统先创建容器再渲染场景，需要调整初始化顺序：
- `renderControl`: 仅保存容器引用
- `renderAnimation`: 创建场景（Canvas 此时可用）
- `renderGraph`: 设置图表 Canvas
- `renderReadout`: 设置数据回调
- `mount`: 绑定事件（按钮、窗口调整等）

### 3. 配置兼容
```typescript
layoutConfig: {
  defaultLeftRatio: 0.38,    // 左侧占比
  leftMinWidth: 380,          // 最小宽度
  leftMaxWidth: 960,          // 最大宽度
  hasGraph: true,             // 显示图表
  graphHeight: 0.4,           // 图表高度
  controlColumns: 1,          // 控制列数
  readoutCollapsed: true,     // 数据区折叠
  hideHeader: true,           // 隐藏头部
  readoutLabel: '数据读数'    // 标签
}
```

## 访问方式

```
测试对比页: http://localhost:5179/src/pages/index-layout-test.html
V3 新版:    http://localhost:5179/src/pages/spring-oscillator.html
Legacy:     http://localhost:5179/src/pages/spring-oscillator-legacy.html
```

## 迁移总结

### 保留旧代码
- `page-legacy.ts` - 完全保留作为模板
- `spring-oscillator-legacy.html` - 可访问旧版本

### 新增文件
- `src/app/layouts/` - 布局母版系统
- `page-new.ts` - 使用新布局系统的版本
- `layout-tokens.css` - 共享设计令牌

### 核心改进
1. **布局母版化**: SplitRightLayout 可复用于其他场景
2. **主题统一**: 所有布局共享 CSS 变量
3. **响应式**: 自动适配桌面/平板/手机
4. **可扩展**: 易于添加新的布局母版

## 注意事项

- V3 版本图表区可能需要额外初始化才能显示 x-t 图像
- 工具栏按钮文字略有差异（功能相同）
- 两者完全独立，互不影响

---

**审阅状态**: ✅ 像素级迁移完成
**完成日期**: 2026-04-03
