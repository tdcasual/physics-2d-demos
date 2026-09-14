import type { ControlsSchema } from '../../platform/controls-schema';
import { photoelectricConstants as C } from './scene.sim';

export const photoelectricControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '阴极材料',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'material',
          columns: 3,
          initialActive: 'cesium',
          presets: [
            { id: 'cesium', label: '铯 1.90 eV' },
            { id: 'sodium', label: '钠 2.28 eV' },
            { id: 'zinc', label: '锌 3.31 eV' }
          ]
        }
      ]
    },
    {
      title: '入射光',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'frequency',
          label: '频率 ν',
          min: C.frequencyMin,
          max: C.frequencyMax,
          step: 0.1,
          value: C.defaultFrequency,
          unit: '×10¹⁴ Hz'
        },
        {
          type: 'slider',
          key: 'intensity',
          label: '光强',
          min: C.intensityMin,
          max: C.intensityMax,
          step: 1,
          value: C.defaultIntensity,
          unit: '%'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showVectors', label: '显示电子', value: true },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'reset', label: '重置', variant: 'secondary' }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Eₖ = hν − W₀', 'ν ≥ ν₀ 才有光电流']
        }
      ]
    }
  ]
};
