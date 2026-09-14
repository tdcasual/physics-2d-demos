import type { ControlsSchema } from '../../platform/controls-schema';
import { photoelectricConstants as C } from './scene.sim';

export const photoelectricCutoffControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '入射光',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'wavelength',
          label: '波长 λ',
          min: C.wavelengthMin,
          max: C.wavelengthMax,
          step: 1,
          value: 411,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'intensity',
          label: '光强 P',
          min: C.intensityMin,
          max: C.intensityMax,
          step: 1,
          value: 80,
          unit: '%'
        },
        {
          type: 'slider',
          key: 'voltage',
          label: '电压 U',
          min: C.voltageMin,
          max: C.voltageMax,
          step: 0.01,
          value: 0,
          unit: 'V'
        }
      ]
    },
    {
      title: '阴极',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'cathode',
          columns: 3,
          initialActive: 'sodium',
          presets: [
            { id: 'cesium', label: '铯 Cs' },
            { id: 'sodium', label: '钠 Na' },
            { id: 'calcium', label: '钙 Ca' }
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
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Eₖ(max) = hν − W₀', 'eUc = Eₖ(max)', '反向 U ≤ −Uc → I = 0']
        }
      ]
    }
  ]
};
