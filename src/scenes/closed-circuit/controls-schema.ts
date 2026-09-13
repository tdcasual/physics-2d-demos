import type { ControlsSchema } from '../../platform/controls-schema';
import { closedCircuitConstants } from './scene.sim';

export const closedCircuitControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '电路参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'emf',
          label: '电动势 E',
          min: closedCircuitConstants.emfMin,
          max: closedCircuitConstants.emfMax,
          step: 1,
          value: closedCircuitConstants.defaultEmf,
          unit: 'V'
        },
        {
          type: 'slider',
          key: 'internalResistance',
          label: '内阻 r',
          min: closedCircuitConstants.internalResistanceMin,
          max: closedCircuitConstants.internalResistanceMax,
          step: 0.5,
          value: closedCircuitConstants.defaultInternalResistance,
          unit: 'Ω'
        },
        {
          type: 'slider',
          key: 'externalResistance',
          label: '外阻 R',
          min: closedCircuitConstants.externalResistanceMin,
          max: closedCircuitConstants.externalResistanceMax,
          step: 0.5,
          value: closedCircuitConstants.defaultExternalResistance,
          unit: 'Ω'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showPowerArea',
          label: '功率面积',
          value: true
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
          lines: ['U = E − Ir', 'P出 = UI', 'R = r 时输出功率最大']
        }
      ]
    }
  ]
};
