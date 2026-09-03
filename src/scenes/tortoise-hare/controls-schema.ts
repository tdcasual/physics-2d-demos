import type { ControlsSchema } from '../../platform/controls-schema';
import { RACE_PRESETS, DEFAULT_RACE_PRESET_ID } from './scene.sim';

export const tortoiseHareControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '比赛预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          label: '出发方式与运动组合',
          columns: 2,
          presets: RACE_PRESETS.map((p) => ({
            id: p.id,
            label: p.name,
            desc: p.desc
          })),
          initialActive: DEFAULT_RACE_PRESET_ID
        }
      ]
    },
    {
      title: '原理说明',
      collapsed: true,
      span: 'full',
      fields: [
        {
          type: 'hint',
          key: 'about',
          lines: [
            '两条图线分别是乌龟和兔子的 x–t 图线，随时间逐点绘出；图线交点 = 相遇，水平段 = 停下休息，斜率 = 速度。',
            '切换预设可对比同时同地、同时非同地、同地非同时等出发方式，以及折线（匀速）与曲线（匀加速）的组合。'
          ]
        }
      ]
    }
  ]
};
