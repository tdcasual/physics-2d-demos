import type { ControlsSchema } from '../../platform/controls-schema';
import { semicylinderStandardConstants as C } from './scene.sim';

export const semicylinderStandardControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '介质',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'material',
          columns: 3,
          initialActive: 'glass',
          presets: [
            { id: 'water', label: '水 1.33' },
            { id: 'glass', label: 'K9 1.52' },
            { id: 'diamond', label: '钻石 2.42' }
          ]
        },
        {
          type: 'slider',
          key: 'refractiveIndex',
          label: '折射率 n',
          min: C.indexMin,
          max: C.indexMax,
          step: C.indexStep,
          value: C.defaultIndex
        }
      ]
    },
    {
      title: '入射光',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'incidentAngle',
          label: '入射角 θ₁',
          min: C.angleMin,
          max: C.angleMax,
          step: C.angleStep,
          value: C.defaultAngle,
          unit: '°'
        },
        {
          type: 'button-grid',
          key: 'actions',
          columns: 2,
          buttons: [
            { key: 'critical', label: '对准临界角' },
            { key: 'reset', label: '复位' }
          ]
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showNormal', label: '显示法线', value: true },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    }
  ]
};
