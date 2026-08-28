/**
 * 声明式控制框架 — 类型定义
 *
 * 场景通过定义 schema 而非 imperative DOM 代码来描述控制面板。
 */

/** 控制字段联合类型：滑块、数字输入、文本、选择器、按钮等 */
export type ControlField =
  | {
      type: 'slider';
      key: string;
      label: string;
      min: number;
      max: number;
      step: number;
      value: number;
      unit?: string;
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
    }
  | {
      type: 'button';
      key: string;
      label: string;
      variant?: 'primary' | 'secondary' | 'danger';
    }
  | {
      type: 'toggle';
      key: string;
      label: string;
      value: boolean;
    }
  | {
      type: 'preset-group';
      key: string;
      label?: string;
      columns?: 2 | 3 | 4;
      presets: Array<{ id: string; label: string; desc?: string }>;
      initialActive?: string;
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
    }
  | {
      type: 'button-grid';
      key: string;
      label?: string;
      columns?: 1 | 2 | 3;
      buttons: Array<{ key: string; label: string; desc?: string }>;
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
    };

/** 控制区域（可折叠的卡片） */
export type ControlsSection = {
  title: string;
  collapsed?: boolean;
  /** 显式声明跨列行为。`'full'` 强制占满整行，不设则自动检测（含 slider/text → 全宽） */
  span?: 'full';
  fields: ControlField[];
};

/** 完整控制面板 schema */
export type ControlsSchema = {
  sections: ControlsSection[];
};
