import type { ControlsSchema } from '../../platform/controls-schema';
import { closedPowerConstants } from './scene.sim';

export const closedPowerControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '电源参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'emf',
          label: '电动势 E',
          min: closedPowerConstants.emfMin,
          max: closedPowerConstants.emfMax,
          step: 0.5,
          value: closedPowerConstants.defaultEmf,
          unit: 'V'
        },
        {
          type: 'slider',
          key: 'internalResistance',
          label: '内阻 r',
          min: closedPowerConstants.internalResistanceMin,
          max: closedPowerConstants.internalResistanceMax,
          step: 0.5,
          value: closedPowerConstants.defaultInternalResistance,
          unit: 'Ω'
        },
        {
          type: 'slider',
          key: 'externalResistance',
          label: '外阻 R',
          min: closedPowerConstants.externalResistanceMin,
          max: closedPowerConstants.externalResistanceMax,
          step: 0.5,
          value: closedPowerConstants.defaultExternalResistance,
          unit: 'Ω'
        }
      ]
    },
    {
      title: '负载预设',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'presets',
          columns: 3,
          buttons: [
            { key: 'short', label: '短路 R=0' },
            { key: 'matched', label: '匹配 R=r' },
            { key: 'max', label: '最大负载' }
          ]
        },
        {
          type: 'toggle',
          key: 'showPowerArea',
          label: '显示极值线',
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
          lines: ['I = E/(R+r)', 'P出 = E²R/(R+r)²', 'R = r 时 P出最大']
        }
      ]
    }
  ]
};
