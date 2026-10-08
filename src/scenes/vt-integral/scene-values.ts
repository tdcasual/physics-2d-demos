/**
 * 场景值单一数据源
 * 场景 id、矩形取法的合法性校验与 URL 数字编码以此为准；UI 展示标签在
 * controls-schema.ts，两处标签需保持同步。
 */

import type { VtMethod, VtScene } from './scene.sim';

const VT_SCENES: { value: VtScene; label: string; desc: string }[] = [
  {
    value: 'scene1',
    label: 'v-t面积',
    desc: '矩形逼近 v-t 图面积'
  },
  { value: 'scene2', label: '化曲为直', desc: '拖动 A、B 比较直线与轨迹' },
  { value: 'scene3', label: '割圆术', desc: '内接多边形逼近圆周' }
] as const;

// 类型守卫：运行时验证场景值
export function isValidVtScene(value: string): value is VtScene {
  return VT_SCENES.some((s) => s.value === value);
}

/**
 * 子场景 1 的矩形取法（URL 键 `rule`）：0 = 左端点，1 = 右端点。
 * 左端点 = 每小段按初速度匀速，右端点 = 按末速度匀速；递增 v(t) 时
 * 两者分别偏小、偏大，夹逼真实位移。
 */
export type VtRule = 'left' | 'right';

/** URL / select 值 → 取法；无法识别时回落左端点（默认）。 */
export function decodeVtRule(value: unknown): VtRule {
  if (value === 'right' || value === 1 || value === '1') return 'right';
  return 'left';
}

/** 取法 → URL 数字编码（mid/trap 不在 UI 暴露，按左端点编码）。 */
export function encodeVtRule(method: VtMethod): 0 | 1 {
  return method === 'right' ? 1 : 0;
}

/** 取法名称：左端点 / 右端点（mid/trap 仅 API 兼容，不在 UI 暴露）。 */
export function vtRuleLabel(method: VtMethod): string {
  if (method === 'left') return '左端点';
  if (method === 'right') return '右端点';
  return method === 'mid' ? '中点' : '梯形';
}

/** 子场景 → URL 数字编码（1 基）。 */
export function encodeVtScene(scene: VtScene): 1 | 2 | 3 {
  if (scene === 'scene2') return 2;
  if (scene === 'scene3') return 3;
  return 1;
}

/** URL 数字 / 'sceneN' 字符串 → 子场景；无法识别回落 scene1。 */
export function decodeVtScene(value: unknown): VtScene {
  if (value === 'scene2' || value === 2 || value === '2') return 'scene2';
  if (value === 'scene3' || value === 3 || value === '3') return 'scene3';
  return 'scene1';
}
