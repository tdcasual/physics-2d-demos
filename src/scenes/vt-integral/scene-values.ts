/**
 * 场景值单一数据源
 * UI 和 sim 层都从此文件导入，确保一致性
 */

import type { VtScene } from './scene.sim';

export const VT_SCENES: { value: VtScene; label: string; desc: string }[] = [
  { value: 'scene1', label: 'v-t面积', desc: '速度时间图面积' },
  { value: 'scene2', label: '曲线逼近', desc: '用矩形逼近曲线下面积' },
  { value: 'scene3', label: '圆面积', desc: '圆面积微元法' },
  { value: 'scene4', label: '表面积', desc: '表面积微元法' },
  { value: 'scene5', label: '旋转体', desc: '旋转体体积' }
] as const;

// 类型守卫：运行时验证场景值
export function isValidVtScene(value: string): value is VtScene {
  return VT_SCENES.some(s => s.value === value);
}
