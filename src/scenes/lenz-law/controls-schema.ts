import type { ControlsSchema } from '../../platform/controls-schema';
import { lenzLawConstants as C } from './scene.sim';

export const lenzLawControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '磁铁运动',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'motion',
          columns: 2,
          initialActive: 'approach',
          presets: [
            { id: 'approach', label: '靠近 · 来拒' },
            { id: 'recede', label: '远离 · 去留' }
          ]
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'speed',
          label: '运动速度 v',
          min: C.speedMin,
          max: C.speedMax,
          step: 0.05,
          value: C.defaultSpeed,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'magnetStrength',
          label: '磁铁强度 B₀',
          min: C.strengthMin,
          max: C.strengthMax,
          step: 0.1,
          value: C.defaultStrength,
          unit: 'T'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showVectors', label: '显示矢量', value: true },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'reset', label: '重置', variant: 'secondary' }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['E = −ΔΦ/Δt', '增反减同', '来拒去留']
        }
      ]
    }
  ]
};
