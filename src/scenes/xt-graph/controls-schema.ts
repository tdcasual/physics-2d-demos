import type { ControlsSchema } from '../../platform/controls-schema';
import { XT_PRESETS, DEFAULT_PRESET_ID } from './scene.sim';

export const xtGraphControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '运动预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          label: '选择运动',
          columns: 3,
          presets: XT_PRESETS.map((p) => ({
            id: p.id,
            label: p.name,
            desc: p.desc
          })),
          initialActive: DEFAULT_PRESET_ID
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
            '蓝色曲线为 x–t 图线，随时间逐点绘出；红色光点是小车的实时坐标 (t, x)，下方小车与图线严格同步。',
            '图线水平 → 静止；倾斜直线 → 匀速；曲线 → 变速；图线上某点的斜率 = 该时刻的速度。'
          ]
        }
      ]
    }
  ]
};
