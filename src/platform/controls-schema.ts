/**
 * 声明式控制框架 — 类型定义
 *
 * 场景通过定义 schema 而非 imperative DOM 代码来描述控制面板。
 */

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
      type: 'custom';
      key: string;
      label: string;
      render: (mount: HTMLElement) => void | (() => void);
    };

export type ControlsSection = {
  title: string;
  collapsed?: boolean;
  fields: ControlField[];
};

export type ControlsSchema = {
  sections: ControlsSection[];
};
