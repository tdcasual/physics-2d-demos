import type { ControlsSchema } from '../../platform/controls-schema';
import { zincPhotoelectricConstants as C } from './scene.sim';

export const zincPhotoelectricControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '光束',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'wavelength',
          label: '波长 λ',
          min: C.wavelengthMin,
          max: C.wavelengthMax,
          step: 1,
          value: 247,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'intensity',
          label: '光强 I',
          min: C.intensityMin,
          max: C.intensityMax,
          step: 1,
          value: 80,
          unit: '%'
        }
      ]
    },
    {
      title: '金属板',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'chargeState',
          columns: 2,
          initialActive: 'rubbed',
          presets: [
            { id: 'rubbed', label: '摩擦带负电' },
            { id: 'grounded', label: '接地（0）' }
          ]
        }
      ]
    },
    {
      title: '动画',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '电子运动', value: true }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['hν = W₀ + Eₖ(max)', 'λ < λ₀ 才能逸出', '光强只改变电子数']
        }
      ]
    }
  ]
};
