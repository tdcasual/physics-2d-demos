/**
 * 场景值单一数据源
 * 场景 id 的合法性校验以此为准；UI 展示标签在 controls-schema.ts，
 * 两处标签需保持同步。
 */

import type { VtScene } from './scene.sim';

const VT_SCENES: { value: VtScene; label: string; desc: string }[] = [
  {
    value: 'scene1',
    label: 'v-t面积',
    desc: '矩形逼近 v-t 图面积（以直代曲）'
  },
  { value: 'scene2', label: '化曲为直', desc: '折线逼近曲线弧长' },
  { value: 'scene3', label: '割圆术', desc: '内接多边形逼近圆周' }
] as const;

// 类型守卫：运行时验证场景值
export function isValidVtScene(value: string): value is VtScene {
  return VT_SCENES.some((s) => s.value === value);
}
