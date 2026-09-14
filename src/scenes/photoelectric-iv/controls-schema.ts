import type { ControlsSchema } from '../../platform/controls-schema';
import { photoelectricConstants as C } from './scene.sim';

export const photoelectricControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '光照参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'wavelength',
          label: '入射波长 λ',
          min: C.wavelengthMin,
          max: C.wavelengthMax,
          step: 1,
          value: 411,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'intensity',
          label: '光照强度 P',
          min: C.intensityMin,
          max: C.intensityMax,
          step: 1,
          value: 80,
          unit: '%'
        },
        {
          type: 'slider',
          key: 'voltage',
          label: '外加电压 U',
          min: C.voltageMin,
          max: C.voltageMax,
          step: 0.01,
          value: 0,
          unit: 'V'
        }
      ]
    },
    {
      title: '阴极材料',
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
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '微观动画', value: true }
      ]
    },
    {
      title: '规律',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Eₖ = hν − W₀', 'eUc = Eₖ(max)', '光强 ↑ → Iₘ ↑']
        }
      ]
    }
  ]
};
