import type { ControlsSchema } from '../../platform/controls-schema';
import { connectedBodiesConstants } from './scene.sim';
export const connectedBodiesControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '连接体模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'arrangement',
          columns: 2,
          presets: [
            { id: 'string-spring', label: '细绳 + 弹簧' },
            { id: 'spring-string', label: '弹簧 + 细绳' }
          ],
          initialActive: 'string-spring'
        }
      ]
    },
    {
      title: '质量参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'massA',
          label: '球 A 质量 mₐ',
          min: connectedBodiesConstants.massMin,
          max: connectedBodiesConstants.massMax,
          step: 0.5,
          value: connectedBodiesConstants.defaultMassA,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'massB',
          label: '球 B 质量 mᵦ',
          min: connectedBodiesConstants.massMin,
          max: connectedBodiesConstants.massMax,
          step: 0.5,
          value: connectedBodiesConstants.defaultMassB,
          unit: 'kg'
        }
      ]
    },
    {
      title: '瞬时操作',
      collapsed: false,
      fields: [
        { type: 'button', key: 'cutUpper', label: '剪断上方连接' },
        { type: 'button', key: 'cutLower', label: '剪断下方连接' },
        { type: 'button', key: 'reset', label: '重置平衡', variant: 'danger' }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: [
            '轻绳张力可突变',
            '未剪断轻弹簧弹力不突变',
            't = 0⁺：速度连续，加速度可突变'
          ]
        }
      ]
    }
  ]
};
