import type { ControlsSchema } from '../../platform/controls-schema';
import { chargedSuperpositionConstants as C } from './scene.sim';

export const chargedSuperpositionControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '粒子',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'particle',
          columns: 3,
          initialActive: 'proton',
          presets: [
            { id: 'proton', label: '质子 H⁺' },
            { id: 'alpha', label: 'α粒子' },
            { id: 'electron', label: '电子 e⁻' }
          ]
        }
      ]
    },
    {
      title: '电压',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'accelVoltage',
          label: '加速电压 U₁',
          min: C.accelVoltageMin,
          max: C.accelVoltageMax,
          step: 10,
          value: C.defaultAccelVoltage,
          unit: 'V'
        },
        {
          type: 'slider',
          key: 'deflectVoltage',
          label: '偏转电压 U₂',
          min: C.deflectVoltageMin,
          max: C.deflectVoltageMax,
          step: 1,
          value: C.defaultDeflectVoltage,
          unit: 'V'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showVectors', label: '显示电场', value: true },
        { type: 'toggle', key: 'slowMode', label: '慢速模式', value: false },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        {
          type: 'button',
          key: 'relaunch',
          label: '重新发射',
          variant: 'primary'
        },
        { type: 'button', key: 'reset', label: '复位', variant: 'secondary' }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Y 与粒子比荷无关', '反向延长线过极板中心']
        }
      ]
    }
  ]
};
