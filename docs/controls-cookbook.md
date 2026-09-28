# 控制面板食谱（Controls Cookbook）

> 面向不熟悉本项目的代理：本文所有代码片段均逐字核对过
> `src/platform/controls-schema.ts`（类型定义）与
> `src/ui/components/SchemaRenderer.ts`（渲染行为），可直接复制粘贴使用。

## 0. 何时用 schema，何时用 imperative

**默认一律用声明式 `controls-schema.ts`**：新建一个导出 `ControlsSchema` 的文件，
在 `page.ts` 里用 `renderSchema({ mount, schema, onChange, onAction })` 渲染即可。
它自动获得折叠卡片、列布局、URL 参数回写、统一视觉风格。

**只有以下情况才写 imperative `controls.ts`**（需在 PR 中说明理由）：

- 控件列表在运行时动态增删（如 `spring-oscillator` 动态添加振子、
  `ganshe` 动态管理观察点）；
- schema 的 12 种字段类型确实表达不了的交互（先试 `custom` 字段再放弃）。

注意：imperative `controls.ts` 不得 import `ui/`（ESLint `no-restricted-imports`）。
ui 工厂由 `page.ts` 注入（结构类型参数），场景层保持零 ui 导入——见
`spring-oscillator` / `ganshe`。禁止恢复行内 `eslint-disable` 豁免（debt-ledger A2 已清）。

## 1. 总体接线方式

```typescript
// page.ts
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { myControlsSchema } from './controls-schema';

createControls: ({ mount, scene, writeParam }) => {
  const renderer = renderSchema({
    mount,
    schema: myControlsSchema,
    onChange: (key, value) => {
      // 值类字段：slider/number/toggle → number|boolean
      //          text/select/preset-group/scene-selector → string
      writeParam?.(key, value); // 同步到 URL（可选但推荐）
    },
    onAction: (key) => {
      // 动作类字段：button、button-grid、transport
    }
  });
  return renderer; // 返回句柄，URL 管线会用它回写参数
};
```

`renderer` 句柄（`SchemaRendererInstance`）提供：

| 成员                           | 适用字段                                                          |
| ------------------------------ | ----------------------------------------------------------------- |
| `setValue(key, value)`         | `slider`、`number`、`text`、`select`、`toggle`（会触发 onChange） |
| `setValueSilently(key, value)` | 同上（不触发 onChange，URL 投影用）                               |
| `getValue<T>(key)`             | `number`、`text`、`select`                                        |
| `setActive(key, id)`           | `preset-group`、`scene-selector`                                  |
| `setActiveSilently(key, id)`   | 同上                                                              |
| `setVisible(key, visible)`     | 任意字段 key，或 **section 的 title**（隐藏整张卡片）             |
| `element`                      | 挂载点 `HTMLElement`                                              |
| `fieldTypes`                   | 字段键 → schema 类型（`Map`）                                     |
| `dispose()`                    | 清理全部                                                          |

## 2. 十二种字段类型

### 2.1 slider — 连续数值

```typescript
{
  type: 'slider',
  key: 'v0',
  label: 'v₀',
  min: 0,
  max: 80,
  step: 0.5,
  value: 30,
  unit: 'm/s' // 可选
}
```

- `onChange(key, value)`：`value` 为 `number`。
- 出处：`src/scenes/projectile/controls-schema.ts`。
- ⚠️ 含 slider 的 section 会被自动标记 `data-span="full"` 占满整行（见第 3 节）。
- ⚠️ `min/max/step/value` 均为必填，缺一个就过不了 TS。

### 2.2 number — 精确数字输入

```typescript
{
  type: 'number',
  key: 'totalTime',
  label: '总时间 T',
  value: 10,
  min: 1,   // 可选
  max: 120, // 可选
  step: 0.5,// 可选
  unit: 's' // 可选
}
```

- `onChange(key, value)`：`value` 为 `number`。
- 出处：`src/scenes/chase-meet/controls-schema.ts`。
- 支持 `renderer.setValue(key, n)` 回写（会触发 onChange）；静默回写用
  `setValueSilently`。场景自行读取时可用 `renderer.getValue<number>(key)`。

### 2.3 text — 自由文本

```typescript
{
  type: 'text',
  key: 'vExprA',
  label: '速度函数 vA(t)',
  value: '2',
  fontFamily: 'monospace' // 可选
}
```

- `onChange(key, value)`：`value` 为 `string`。
- 出处：`src/scenes/chase-meet/controls-schema.ts`（表达式输入）。
- ⚠️ 与 slider 一样会让所在 section 自动占满整行。
- ⚠️ 每次按键都触发 onChange，重活请自行防抖。

### 2.4 select — 下拉选择

```typescript
{
  type: 'select',
  key: 'precision',
  label: '精度',
  value: '0.02',
  options: [
    { label: '0.02 mm（50 分度）', value: '0.02' },
    { label: '0.05 mm（20 分度）', value: '0.05' },
    { label: '0.1 mm（10 分度）', value: '0.1' }
  ]
}
```

- `onChange(key, value)`：`value` 为 `string`（即 options 里的 `value`，
  **不是** `label`）。
- 出处：`src/instruments/vernier-caliper-guide/controls-schema.ts`。
- ⚠️ options 每项是 `{ label, value }`，键名顺序无所谓但两个都不能缺。

### 2.5 button — 单个动作按钮

```typescript
{ type: 'button', key: 'apply', label: '应用参数' }
```

- 点击走 `onAction(key)`（不是 onChange），无 value。
- 出处：`src/scenes/chase-meet/controls-schema.ts`、
  `src/scenes/field-lines/controls-schema.ts`（`apply-charges` / `reset`）。
- ⚠️ 类型定义里虽有 `variant?: 'primary' | 'secondary' | 'danger'`，
  但当前 `SchemaRenderer` **未消费该字段**（按钮统一渲染为单列 grid），
  写了也无效——不要依赖它。

### 2.6 toggle — 开关

```typescript
{
  type: 'toggle',
  key: 'whiteLight',
  label: '白光模式',
  value: false
}
```

- `onChange(key, value)`：`value` 为 `boolean`。
- 出处：`src/scenes/thin-film/controls-schema.ts`（白光模式）、
  `src/scenes/doppler-effect/controls-schema.ts`（开启音频）。
- 支持 `renderer.setValue(key, true)` 回写。

### 2.7 preset-group — 互斥预设组

```typescript
{
  type: 'preset-group',
  key: 'preset',
  label: '环境预设', // 可选
  columns: 2,        // 可选：2 | 3 | 4
  presets: [
    { id: 'earth', label: '地球', desc: 'g=9.8' },
    { id: 'moon', label: '月球', desc: 'g=1.6' },
    { id: 'mars', label: '火星', desc: 'g=3.7' },
    { id: 'wind', label: '强风', desc: '阻力' }
  ],
  initialActive: 'earth' // 可选
}
```

- `onChange(key, value)`：`value` 为 `string`（被选中预设的 `id`）。
- 出处：`src/scenes/projectile/controls-schema.ts`。
- 程序化切换高亮：`renderer.setActive(key, id)`。
- ⚠️ 预设只发一个 id，具体改哪些参数由你在 onChange 里实现
  （参考 `createPresetApplier`，见 `src/scenes/page-utils.ts`）。

### 2.8 transport — 播放控制条

```typescript
{
  type: 'transport',
  key: 'transport',
  label: '播放控制', // 可选
  showPlay: true,    // 四个 show* 均可选，缺省 = true（显示）
  showPause: true,
  showReset: true,
  showStep: true
}
```

- 走 `onAction(key)`，key 形如 **`transport:play` / `transport:pause` /
  `transport:reset` / `transport:step`**（字段 key + 冒号 + 动作名）。
- 出处：`src/scenes/emf-analogy/controls-schema.ts`（处理示例见
  `src/scenes/emf-analogy/page.ts`）。
- ⚠️ 只想要部分按钮时显式写 `showStep: false` 等；不写就是全开。

### 2.9 scene-selector — 场景/模式切换

```typescript
{
  type: 'scene-selector',
  key: 'scene',
  label: '选择场景', // 可选
  scenes: [
    { id: 'friction', label: '摩擦起电', desc: '两种不同材料摩擦时电子转移' },
    { id: 'contact', label: '接触起电', desc: '带电体与不带电体接触时电荷转移' },
    { id: 'induction', label: '感应起电', desc: '带电体靠近导体时电荷重新分布' }
  ],
  initialActive: 'friction' // 可选
}
```

- `onChange(key, value)`：`value` 为 `string`（选中项的 `id`）。
- 出处：`src/scenes/electrification/controls-schema.ts`、
  `src/scenes/ganshe/controls-schema.ts`。
- 程序化切换：`renderer.setActive(key, id)`。
- 与 preset-group 的区别：scene-selector 语义是「换一个子场景/模式」，
  渲染形态为纵向列表卡片；preset-group 是多列按钮网格。

### 2.10 button-grid — 动作按钮网格

```typescript
{
  type: 'button-grid',
  key: 'action',
  label: '操作', // 可选
  columns: 2,    // 可选：1 | 2 | 3，缺省按 2 渲染
  buttons: [
    { key: 'step', label: '执行步骤' },
    { key: 'reset', label: '重置' }
  ]
}
```

- 每个按钮点击走 `onAction(button.key)`——**注意是按钮自己的 key**，
  不是字段的 key。
- 出处：`src/scenes/electrification/controls-schema.ts`、
  `src/scenes/field-lines/controls-schema.ts`、
  `src/scenes/chase-meet/controls-schema.ts`（columns: 1 作纵向预设列表）。
- ⚠️ 字段级的 `key` 不会出现在回调里，仅用于 `setVisible` 定位。

### 2.11 hint — 静态提示文本

```typescript
{
  type: 'hint',
  key: 'info',
  label: '原理说明', // 可选，渲染为加粗首行
  lines: [
    '摩擦起电：两种不同的材料相互摩擦时，电子会从一种材料转移到另一种材料。',
    '接触起电：带电体与不带电体接触时，电荷会发生转移。'
  ]
}
```

- 纯展示，**不参与 onChange/onAction**；每行渲染为一个 `<p>`，
  颜色 `var(--text-secondary)`。
- 出处：`src/scenes/electrification/controls-schema.ts`、
  `src/instruments/vernier-caliper-guide/controls-schema.ts`。
- 优先用 hint 表达纯文本说明，不要为此写 `custom`。

### 2.12 custom — 逃生口

```typescript
{
  type: 'custom',
  key: 'my-widget',
  label: '自定义控件',
  render: (mount: HTMLElement) => {
    const el = document.createElement('div');
    el.textContent = '任意 DOM';
    mount.appendChild(el);
    return () => el.remove(); // 可选：返回清理函数
  }
}
```

- `render(mount)` 在渲染时调用一次；返回的函数会在 dispose 时调用。
- 当前仓库暂无场景使用（仅 AGENTS.md 示例），属最后手段：
  先用 hint/组合字段表达，实在不行再 custom。

## 3. 列布局（data-span 规则）

在 `layoutConfig.controlColumns: 'auto'` 下，每个 section 是一张卡片：

- **自动全宽**：section 内含 `slider` 或 `text` 字段 → SchemaRenderer 自动给卡片
  打 `data-span="full"`，占满整行（CSS：`grid-column: 1 / -1`）。
- **自动多列**：只含按钮/预设/选择器/transport/toggle 的卡片参与
  `auto-fit` 多列并排（最小 220px）。
- **手动逃生口**：section 上显式写 `span: 'full'` 强制全宽，例如：

```typescript
{ title: '原理说明', collapsed: true, span: 'full', fields: [/* custom 等 */] }
```

**DOM 顺序原则**：把可并排的窄卡片（预设、按钮组）放前面，含滑块的宽卡片放最后，
让窄卡片优先在同一行并排。反例会浪费一整行。

## 4. URL 参数联动

- `createControls` 上下文注入 `writeParam(key, value)`，调用即把参数写进 URL
  query（自动过滤非法键）。推荐在 onChange 处理完业务逻辑后调用。
- 合法键集合 = `meta.defaultParams` 的键 ∪ `meta.urlSyncKeys` ∪ `{preset}`。
  想让某个控件可 URL 同步，把它的 key 放进其中一处即可。
- 页面加载时 URL 管线自动执行 `readSceneParams → scene.setParams →
用你返回的 renderer 回写控件`（数值走 `setValue`，字符串走 `setActive`）——
  所以 onChange 里的 key 必须与 schema 字段 key 一致。
- 控件 key 与 sim 参数名不一致时（如 projectile 的 `v0` → `speed`），用
  `bootScenePage` 的 `paramSync.paramMap` 声明映射；更复杂的接管用
  `paramSync.applyParam` / `applyAll`。**细节见根目录 AGENTS.md 的
  「URL 参数同步」小节，本文不展开。**

## 5. 选择指南（我要做 X → 用哪个字段）

| 需求                                   | 字段类型           |
| -------------------------------------- | ------------------ |
| 调连续物理量（速度、角度、波长）       | `slider`           |
| 精确输入数值（步长、总时间、电荷量）   | `number`           |
| 输入表达式/颜色等字符串                | `text`             |
| 少量固定枚举（精度档位、模式）         | `select`           |
| 一个触发动作（应用、重置）             | `button`           |
| 布尔开关（音频、白光模式）             | `toggle`           |
| 一组互斥参数预设（地球/月球/火星）     | `preset-group`     |
| 播放/暂停/重置/单步                    | `transport`        |
| 切换子场景或大模式                     | `scene-selector`   |
| 多个触发动作并排（步骤/重置/切换视图） | `button-grid`      |
| 纯说明文字                             | `hint`             |
| 以上都表达不了                         | `custom`（先三思） |

## 6. 常见错误速查

1. **button 的回调进错了口子**：button/button-grid/transport 走 `onAction`，
   其余走 `onChange`。
2. **transport 的 key 带后缀**：是 `transport:play` 不是 `play`。
3. **button-grid 回调给的是按钮 key**，不是字段 key。
4. **preset 高亮不自动持久**：场景重置后如需恢复高亮，自己调
   `renderer.setActive(key, id)`。
5. **写了 `variant` 期待按钮变色**：当前渲染器不消费，无效。
6. **把 slider 和按钮塞进同一 section**：整卡被拉成全宽，按钮无法与邻卡并排。
7. **key 与 meta.defaultParams/urlSyncKeys 对不上**：URL 同步静默失效。
