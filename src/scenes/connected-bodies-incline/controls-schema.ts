import type { ControlsSchema } from '../../platform/controls-schema';
import { connectedBodiesInclineConstants as C } from './scene.sim';

export const connectedBodiesInclineControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '演示模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'freebody',
          presets: [
            { id: 'freebody', label: '正交分解' },
            { id: 'animation', label: '播放动画' }
          ]
        }
      ]
    },
    {
      title: '系统参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'massA',
          label: '物块 A 质量 mₐ',
          min: C.massMin,
          max: C.massMax,
          step: C.massStep,
          value: C.defaultMassA,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'massB',
          label: '物块 B 质量 mᵦ',
          min: C.massMin,
          max: C.massMax,
          step: C.massStep,
          value: C.defaultMassB,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'angle',
          label: '斜面倾角 θ',
          min: C.angleMin,
          max: C.angleMax,
          step: C.angleStep,
          value: C.defaultAngle,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'mu',
          label: '摩擦因数 μ',
          min: C.muMin,
          max: C.muMax,
          step: C.muStep,
          value: C.defaultMu
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showForces',
          label: '显示受力分解',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: false },
        {
          type: 'button-grid',
          key: 'actions',
          columns: 2,
          buttons: [{ key: 'reset', label: '复位' }]
        }
      ]
    }
  ]
};
