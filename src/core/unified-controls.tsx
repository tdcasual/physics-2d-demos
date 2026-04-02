/**
 * 统一控制组件系统
 * 提供标准化的参数控制面板
 */

import { createControlPanel, createSlider, createButton, createButtonGroup, createSelect } from '../ui/teaching-controls';
import { Colors } from './colors';

export type ParamType = 'number' | 'slider' | 'select' | 'button' | 'buttonGroup';

export interface ParamConfig {
  key: string;
  label: string;
  type: ParamType;
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  unit?: string;
  description?: string;
}

export interface ControlActions {
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onStep?: () => void;
  onParamChange?: (key: string, value: unknown) => void;
  onStatus?: (text: string) => void;
}

export interface UnifiedControlsOptions {
  container: HTMLElement;
  title: string;
  subtitle?: string;
  params: ParamConfig[];
  actions: ControlActions;
  initialStatus?: string;
  showPlaybackControls?: boolean;
}

export interface UnifiedControls {
  updateParam: (key: string, value: unknown) => void;
  updateStatus: (text: string) => void;
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
}

/**
 * 创建统一控制组件
 */
export function createUnifiedControls(options: UnifiedControlsOptions): UnifiedControls {
  const { container, title, subtitle, params, actions, initialStatus, showPlaybackControls = true } = options;
  
  // 状态管理
  const paramValues = new Map<string, unknown>();
  const controls = new Map<string, HTMLElement>();
  let statusEl: HTMLElement | null = null;
  
  // 初始化参数值
  params.forEach(p => paramValues.set(p.key, p.value));
  
  // 创建控制面板
  const panel = createControlPanel({ title, subtitle });
  
  // 播放控制区
  if (showPlaybackControls) {
    const playbackSection = document.createElement('div');
    playbackSection.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid ${Colors.cloud}30;
    `;
    
    const btnPlay = createButton({
      label: '▶ 播放',
      variant: 'primary',
      onClick: () => actions.onPlay?.()
    });
    
    const btnPause = createButton({
      label: '⏸ 暂停',
      variant: 'secondary',
      onClick: () => actions.onPause?.()
    });
    
    const btnReset = createButton({
      label: '⟲ 重置',
      variant: 'danger',
      onClick: () => actions.onReset?.()
    });
    
    playbackSection.append(btnPlay, btnPause, btnReset);
    panel.appendChild(playbackSection);
  }
  
  // 参数控制区
  const paramsSection = document.createElement('div');
  paramsSection.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;
  
  params.forEach(param => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    // 标签
    const label = document.createElement('label');
    label.textContent = param.label + (param.unit ? ` (${param.unit})` : '');
    label.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      color: ${Colors.dark};
      font-family: Satoshi, sans-serif;
    `;
    wrapper.appendChild(label);
    
    // 根据类型创建控制
    let control: HTMLElement;
    
    switch (param.type) {
      case 'slider':
        control = createSlider({
          value: param.value as number,
          min: param.min ?? 0,
          max: param.max ?? 100,
          step: param.step ?? 1,
          label: param.label,
          onChange: (value) => {
            paramValues.set(param.key, value);
            actions.onParamChange?.(param.key, value);
          }
        });
        break;
        
      case 'select':
        control = createSelect({
          value: param.value as string,
          options: param.options ?? [],
          onChange: (value) => {
            paramValues.set(param.key, value);
            actions.onParamChange?.(param.key, value);
          }
        });
        break;
        
      case 'buttonGroup':
        control = createButtonGroup({
          options: param.options?.map(o => o.label) ?? [],
          selectedIndex: param.options?.findIndex(o => o.value === param.value) ?? 0,
          onChange: (index) => {
            const value = param.options?.[index]?.value;
            if (value !== undefined) {
              paramValues.set(param.key, value);
              actions.onParamChange?.(param.key, value);
            }
          }
        });
        break;
        
      default:
        control = document.createElement('input');
        control.setAttribute('type', 'number');
        control.setAttribute('value', String(param.value));
        (control as HTMLInputElement).addEventListener('change', (e) => {
          const value = parseFloat((e.target as HTMLInputElement).value);
          paramValues.set(param.key, value);
          actions.onParamChange?.(param.key, value);
        });
    }
    
    if (param.description) {
      control.setAttribute('title', param.description);
    }
    
    controls.set(param.key, control);
    wrapper.appendChild(control);
    paramsSection.appendChild(wrapper);
  });
  
  panel.appendChild(paramsSection);
  
  // 状态栏
  const statusSection = document.createElement('div');
  statusSection.style.cssText = `
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid ${Colors.cloud}30;
  `;
  
  statusEl = document.createElement('div');
  statusEl.style.cssText = `
    font-size: 13px;
    color: ${Colors.slate};
    font-family: Satoshi, sans-serif;
    line-height: 1.5;
    padding: 12px;
    background: ${Colors.bg};
    border-radius: 8px;
    min-height: 40px;
  `;
  statusEl.textContent = initialStatus ?? '准备就绪';
  
  statusSection.appendChild(statusEl);
  panel.appendChild(statusSection);
  
  container.appendChild(panel);
  
  return {
    updateParam(key, value) {
      paramValues.set(key, value);
      // 更新UI
      const control = controls.get(key);
      if (control) {
        if (control.tagName === 'INPUT') {
          (control as HTMLInputElement).value = String(value);
        }
        // 其他类型需要特定的更新逻辑
      }
    },
    
    updateStatus(text) {
      if (statusEl) {
        statusEl.textContent = text;
      }
      actions.onStatus?.(text);
    },
    
    setEnabled(enabled) {
      controls.forEach(control => {
        if (control instanceof HTMLInputElement || 
            control instanceof HTMLSelectElement ||
            control instanceof HTMLButtonElement) {
          control.disabled = !enabled;
        }
      });
    },
    
    dispose() {
      panel.remove();
      controls.clear();
      paramValues.clear();
    }
  };
}
