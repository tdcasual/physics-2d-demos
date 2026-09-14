import type { ControlsSchema } from '../../platform/controls-schema';
import { massSpectrometerConstants as C } from './scene.sim';

export const massSpectrometerControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '场强',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'voltage',
          label: '加速电压 U',
          min: C.voltageMin,
          max: C.voltageMax,
          step: 1,
          value: C.defaultVoltage,
          unit: 'V'
        },
        {
          type: 'slider',
          key: 'fieldStrength',
          label: '偏转磁场 B',
          min: C.fieldMin,
          max: C.fieldMax,
          step: 0.01,
          value: C.defaultField,
          unit: 'T'
        }
      ]
    },
    {
      title: '粒子',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showProtium', label: '氢 ¹H⁺', value: true },
        { type: 'toggle', key: 'showDeuterium', label: '氘 ²H⁺', value: true },
        { type: 'toggle', key: 'showTritium', label: '氚 ³H⁺', value: true }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showVectors', label: '显示矢量', value: true },
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
          lines: ['qU = ½mv²', 'r = mv / (qB)', 'm = B²R²q / (2U)']
        }
      ]
    }
  ]
};
