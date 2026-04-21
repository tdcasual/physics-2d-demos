/**
 * 场景控制组件类型定义
 */

export interface ControlItem {
  type: 'slider' | 'select' | 'button' | 'button-group';
  label: string;
  key: string;
  value?: number | string;
  options?: Array<{ label: string; value: string }>;
  buttons?: Array<{ label: string; value: string; desc?: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface SceneControlsOptions {
  title: string;
  icon?: string;
  headerActions?: HTMLElement[];
  defaultCollapsed?: boolean;
  onChange?: (key: string, value: number | string) => void;
}

export interface SceneControlsInstance {
  element: HTMLElement;
  body: HTMLElement;
  setValue: (key: string, value: number | string) => void;
  getValue: (key: string) => number | string | undefined;
}
