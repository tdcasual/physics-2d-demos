/**
 * 控件 ↔ 场景参数绑定（单一声明点）
 *
 * 三个表示空间：
 * - 控件值：面板上显示/提交的数值（如观察位置 50 %）
 * - 参数值：sim `setParams` / `getParams` 的数值（如 cursorY 0.5）
 * - URL / meta.defaultParams：约定为**参数值**（readSceneParams 按
 *   defaultParams 的类型解析）
 *
 * 字段上的 `bind` 是两者换算的唯一来源：`param` 为参数键（缺省同控件键），
 * `scale` 为「控件值 = 参数值 × scale」（缺省 1），`values` 为枚举 / 布尔编码，
 * `numeric` 为数字字符串选项 id ↔ 数值。URL 恢复、控件投影、
 * writeParam 写回与 page onChange 都经由本模块换算，禁止在 page 里再手写
 * `/ 100` 或键名映射表。
 */

import type { ControlsSchema, ParamBinding } from './controls-schema';

export type { ParamBinding };

/** 收集后的绑定：附带字段类型，供 toggle 解码为布尔 */
export type ResolvedBinding = ParamBinding & { fieldType?: string };

export type ParamBindings = ReadonlyMap<string, ResolvedBinding>;

export type ControlValue = number | string | boolean;

/** 收集 schema 中声明了 bind 的字段：控件键 → 绑定 */
export function collectBindings(
  schema: ControlsSchema
): Map<string, ResolvedBinding> {
  const bindings = new Map<string, ResolvedBinding>();
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if ('bind' in field && field.bind) {
        bindings.set(field.key, { ...field.bind, fieldType: field.type });
      }
    }
  }
  return bindings;
}

/** 控件键 → 参数键 */
export function paramKeyOf(
  controlKey: string,
  bindings: ParamBindings | undefined
): string {
  return bindings?.get(controlKey)?.param ?? controlKey;
}

function scaleOf(binding: ParamBinding | undefined): number {
  const scale = binding?.scale;
  return typeof scale === 'number' && Number.isFinite(scale) && scale !== 0
    ? scale
    : 1;
}

/** 控件值 → 参数值：枚举按 values 编码，数值按 scale 换算，其余原样 */
export function controlToParam<T>(
  controlKey: string,
  value: T,
  bindings: ParamBindings | undefined
): T | ControlValue {
  const binding = bindings?.get(controlKey);
  if (binding?.values) {
    const encoded = binding.values[String(value)];
    return encoded === undefined ? value : encoded;
  }
  if (binding?.numeric && typeof value === 'string') {
    const parsed = Number(value);
    return value.trim() !== '' && Number.isFinite(parsed) ? parsed : value;
  }
  const scale = scaleOf(binding);
  return typeof value === 'number' && scale !== 1 ? value / scale : value;
}

/** 参数值 → 控件值：枚举反查 values（toggle 还原为布尔），数值按 scale 换算 */
export function paramToControl<T>(
  controlKey: string,
  value: T,
  bindings: ParamBindings | undefined
): T | ControlValue {
  const binding = bindings?.get(controlKey);
  if (binding?.values) {
    for (const [controlValue, paramValue] of Object.entries(binding.values)) {
      if (String(paramValue) === String(value)) {
        return binding.fieldType === 'toggle'
          ? controlValue === 'true'
          : controlValue;
      }
    }
    return value;
  }
  if (binding?.numeric && typeof value === 'number') return String(value);
  const scale = scaleOf(binding);
  return typeof value === 'number' && scale !== 1 ? value * scale : value;
}

/** 控件提交 → setParams 补丁（键名与单位均已换算） */
export function controlChangeToParams(
  controlKey: string,
  value: ControlValue,
  bindings: ParamBindings | undefined
): Record<string, ControlValue> {
  return {
    [paramKeyOf(controlKey, bindings)]: controlToParam(
      controlKey,
      value,
      bindings
    )
  };
}

/** 参数键 → 控件键（反查；多个控件绑定同一参数时取先声明者） */
export function controlKeyOfParam(
  paramKey: string,
  bindings: ParamBindings | undefined
): string {
  if (bindings) {
    for (const [controlKey, binding] of bindings) {
      if ((binding.param ?? controlKey) === paramKey) return controlKey;
    }
  }
  return paramKey;
}

/** 按钮 / button-grid 子按钮上声明的 `bind.action` */
export function lookupBoundAction(
  schema: ControlsSchema,
  key: string
): string | undefined {
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === 'button' && field.key === key) {
        return field.bind?.action;
      }
      if (field.type === 'button-grid') {
        for (const button of field.buttons) {
          if (button.key === key) return button.bind?.action;
        }
      }
    }
  }
  return undefined;
}
