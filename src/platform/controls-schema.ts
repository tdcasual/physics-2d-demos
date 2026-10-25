/**
 * 声明式控制框架 — 类型定义
 *
 * 场景通过定义 schema 而非 imperative DOM 代码来描述控制面板。
 */

/**
 * 控件 ↔ 场景参数换算声明（消费方见 platform/param-binding.ts）。
 * `param` 为 sim 参数键（缺省同控件键）；`scale` 表示「控件值 = 参数值 × scale」；
 * `values` 为枚举 / 布尔编码。
 */
export type ParamBinding = {
  param?: string;
  scale?: number;
  /**
   * 枚举 / 布尔编码：控件值（preset id、select value、toggle 的
   * 'true' | 'false'）→ 参数值。例：`{ scene1: 1, scene2: 2 }`。
   */
  values?: Readonly<Record<string, number | string | boolean>>;
  /** 选项 id 是数字字符串（'3'、'0'）而参数是数值：id ↔ Number(id) */
  numeric?: boolean;
};

type VisibleWhenValue = string | number | boolean;

/**
 * 声明式显隐：所有键都满足时显示（AND）；值为数组时任一相等即满足。
 * 比较的是**控件值**（preset id、toggle 布尔、滑块数值），以字符串相等判断。
 * 例：`{ scene: 'scene1' }`、`{ mode: ['a', 'b'], showGuides: true }`。
 */
export type VisibleWhen = Readonly<
  Record<string, VisibleWhenValue | readonly VisibleWhenValue[]>
>;

type FieldCommon = {
  visibleWhen?: VisibleWhen;
};

/** 控制字段联合类型：滑块、数字输入、文本、选择器、按钮等 */
export type ControlField = FieldCommon &
  (
    | {
        type: 'slider';
        key: string;
        label: string;
        min: number;
        max: number;
        step: number;
        value: number;
        unit?: string;
        /** 可选的展示格式化函数；不改变控件提交的原始数值。 */
        formatValue?: (value: number) => string;
        /** 控件 ↔ 参数换算（见 platform/param-binding.ts）；value/min/max 为控件值 */
        bind?: ParamBinding;
      }
    | {
        type: 'number';
        key: string;
        label: string;
        value: number;
        min?: number;
        max?: number;
        step?: number;
        unit?: string;
        /** 控件 ↔ 参数换算（见 platform/param-binding.ts） */
        bind?: ParamBinding;
      }
    | {
        type: 'text';
        key: string;
        label: string;
        value: string;
        fontFamily?: string;
      }
    | {
        type: 'select';
        key: string;
        label: string;
        value: string;
        options: Array<{ label: string; value: string }>;
        /** 控件 ↔ 参数换算（见 platform/param-binding.ts） */
        bind?: ParamBinding;
      }
    | {
        type: 'button';
        key: string;
        label: string;
        presentationLabel?: string;
        variant?: 'primary' | 'secondary' | 'danger';
      }
    | {
        type: 'toggle';
        key: string;
        label: string;
        value: boolean;
        /** 控件 ↔ 参数换算（见 platform/param-binding.ts） */
        bind?: ParamBinding;
      }
    | {
        type: 'preset-group';
        key: string;
        label?: string;
        columns?: 2 | 3 | 4;
        presets: Array<{
          id: string;
          label: string;
          desc?: string;
          presentationLabel?: string;
        }>;
        initialActive?: string;
        /** 预设 id ↔ 参数值编码（见 ParamBinding.values） */
        bind?: ParamBinding;
      }
    | {
        type: 'transport';
        key: string;
        label?: string;
        showPlay?: boolean;
        showPause?: boolean;
        showReset?: boolean;
        showStep?: boolean;
      }
    | {
        type: 'scene-selector';
        key: string;
        label?: string;
        scenes: Array<{ id: string; label: string; desc?: string }>;
        initialActive?: string;
        /** 控件 ↔ 参数换算（见 platform/param-binding.ts） */
        bind?: ParamBinding;
      }
    | {
        type: 'button-grid';
        key: string;
        label?: string;
        columns?: 1 | 2 | 3;
        buttons: Array<{
          key: string;
          label: string;
          desc?: string;
          presentationLabel?: string;
        }>;
      }
    | {
        type: 'hint';
        key: string;
        label?: string;
        /** 静态提示文本，逐行渲染为 <p>；不参与 onChange */
        lines: string[];
      }
    | {
        type: 'custom';
        key: string;
        label: string;
        render: (mount: HTMLElement) => void | (() => void);
      }
  );

/** 控制区域（可折叠的卡片） */
export type ControlsSection = {
  title: string;
  collapsed?: boolean;
  /** 显式声明跨列行为。`'full'` 强制占满整行，不设则自动检测（含 slider/text → 全宽） */
  span?: 'full';
  /** 整张卡片的声明式显隐（同字段 visibleWhen） */
  visibleWhen?: VisibleWhen;
  fields: ControlField[];
};

/** 完整控制面板 schema */
export type ControlsSchema = {
  sections: ControlsSection[];
};
