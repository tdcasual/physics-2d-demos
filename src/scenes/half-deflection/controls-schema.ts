import type { ControlsSchema } from '../../platform/controls-schema';
import { halfDeflectionConstants } from './scene.sim';

export const halfDeflectionControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '测量方法',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'method',
          columns: 2,
          presets: [
            { id: 'current', label: '电流表半偏' },
            { id: 'voltage', label: '电压表半偏' }
          ],
          initialActive: 'current'
        }
      ]
    },
    {
      title: '电路控制',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'mainSwitch', label: '总开关 S₁', value: true },
        {
          type: 'toggle',
          key: 'auxiliarySwitch',
          label: '辅助开关 S₂',
          value: false
        },
        {
          type: 'slider',
          key: 'rheostat',
          label: '变阻器 R₁',
          min: halfDeflectionConstants.rheostatMin,
          max: halfDeflectionConstants.rheostatMax,
          step: 10,
          value: halfDeflectionConstants.defaultRheostat,
          unit: 'Ω'
        },
        {
          type: 'slider',
          key: 'boxResistance',
          label: '电阻箱 R₂',
          min: halfDeflectionConstants.boxResistanceMin,
          max: halfDeflectionConstants.boxResistanceMax,
          step: 50,
          value: halfDeflectionConstants.defaultBoxResistance,
          unit: 'Ω'
        }
      ]
    },
    {
      title: '记录',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'recordActions',
          columns: 2,
          buttons: [
            { key: 'recordFull', label: '记录满偏' },
            { key: 'recordHalf', label: '记录半偏' },
            { key: 'clear', label: '清空' },
            { key: 'answer', label: '显示答案' }
          ]
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            '调满偏 → 闭合 S₂ → 调半偏',
            '电流表：Rₐ ≈ R₂',
            '电压表：Rᵥ ≈ R₂'
          ]
        }
      ]
    }
  ]
};
