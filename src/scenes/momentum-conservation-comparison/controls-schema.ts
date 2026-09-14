import type { ControlsSchema } from '../../platform/controls-schema';
import { momentumComparisonConstants as C } from './scene.sim';

export const momentumComparisonControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验方案',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'scheme',
          columns: 2,
          presets: [
            { id: 'chute', label: '1. 斜槽平抛法' },
            { id: 'airTrack', label: '2. 气垫导轨法' },
            { id: 'pendulum', label: '3. 双摆碰撞法' }
          ],
          initialActive: 'chute'
        }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'massA',
          label: '入射质量 m₁',
          min: C.massMin,
          max: C.massMax,
          step: 0.1,
          value: C.defaultMassA,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'massB',
          label: '被碰质量 m₂',
          min: C.massMin,
          max: C.massMax,
          step: 0.1,
          value: C.defaultMassB,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'velocityA',
          label: '入射速度 v₁',
          min: C.velocityMin,
          max: C.velocityMax,
          step: 0.1,
          value: C.defaultVelocityA,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'velocityB',
          label: '被碰速度 v₂',
          min: C.velocityMin,
          max: C.velocityMax,
          step: 0.1,
          value: C.defaultVelocityB,
          unit: 'm/s'
        },
        {
          type: 'preset-group',
          key: 'collision',
          columns: 3,
          presets: [
            { id: 'elastic', label: '弹性 e=1' },
            { id: 'partial', label: '非弹性 e=0.6' },
            { id: 'inelastic', label: '完全非弹性 e=0' }
          ],
          initialActive: 'elastic'
        },
        {
          type: 'toggle',
          key: 'showVectors',
          label: '显示速度矢量',
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
          lines: ['p = mv', 'Σp前 = Σp后', 'I外 ≈ 0']
        }
      ]
    }
  ]
};
