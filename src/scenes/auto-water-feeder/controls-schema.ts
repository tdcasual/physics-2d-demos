import type { ControlsSchema } from '../../platform/controls-schema';
import { feederConstants } from './scene.sim';

export const feederControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '系统参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'waterDepth',
          label: '水深 h',
          min: feederConstants.waterMin,
          max: feederConstants.waterMax,
          step: 0.01,
          value: 0.9,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'springConst',
          label: '弹簧劲度系数 k',
          min: feederConstants.springMin,
          max: feederConstants.springMax,
          step: 0.1,
          value: 16,
          unit: 'N/m'
        },
        {
          type: 'slider',
          key: 'sensorGain',
          label: '传感灵敏度 kₛ',
          min: feederConstants.gainMin,
          max: feederConstants.gainMax,
          step: 0.1,
          value: 3
        },
        {
          type: 'slider',
          key: 'supplyVoltage',
          label: '电源电压 U',
          min: feederConstants.voltageMin,
          max: feederConstants.voltageMax,
          step: 0.1,
          value: 12,
          unit: 'V'
        }
      ]
    },
    {
      title: '演示',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'emptyTank',
          label: '空桶初始',
          variant: 'secondary'
        },
        {
          type: 'button',
          key: 'justFloat',
          label: '刚浮起',
          variant: 'secondary'
        },
        {
          type: 'button',
          key: 'componentLimit',
          label: '元件极限',
          variant: 'secondary'
        },
        {
          type: 'toggle',
          key: 'autoRun',
          label: '自动演示',
          value: true
        }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: ['F浮 = ρgS h浸', 'F浮 = G + F弹', 'U₀ = U · R₀ / (R₀ + R₁)']
        }
      ]
    }
  ]
};
