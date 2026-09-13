import type { ControlsSchema } from '../../platform/controls-schema';
import { ampereBalanceConstants } from './scene.sim';

export const ampereBalanceControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '磁场与电流',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'fieldDirection',
          columns: 3,
          buttons: [
            { key: 'up', label: '竖直向上 ↑' },
            { key: 'down', label: '竖直向下 ↓' },
            { key: 'right', label: '水平向右 →' },
            { key: 'left', label: '水平向左 ←' },
            { key: 'normalUp', label: '垂直斜面 ↗' },
            { key: 'normalDown', label: '垂直斜面 ↙' }
          ]
        },
        {
          type: 'preset-group',
          key: 'currentDirection',
          columns: 2,
          presets: [
            { id: 'out', label: '⊙ 垂直纸面向外' },
            { id: 'in', label: '⊗ 垂直纸面向内' }
          ],
          initialActive: 'out'
        }
      ]
    },
    {
      title: '典型平衡情景',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'preset',
          columns: 2,
          buttons: [
            { key: 'balance', label: '近似平衡' },
            { key: 'support-zero', label: '支持力为 0' },
            { key: 'detach', label: '脱离斜面示例' },
            { key: 'reset', label: '恢复初始' }
          ]
        }
      ]
    },
    {
      title: '物理量微调',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'inclineAngle',
          label: '斜面倾角 θ',
          min: ampereBalanceConstants.inclineAngleMin,
          max: ampereBalanceConstants.inclineAngleMax,
          step: 1,
          value: ampereBalanceConstants.defaultInclineAngle,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'magneticField',
          label: '磁感应强度 B',
          min: ampereBalanceConstants.magneticFieldMin,
          max: ampereBalanceConstants.magneticFieldMax,
          step: 0.1,
          value: ampereBalanceConstants.defaultMagneticField,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'current',
          label: '导体棒电流 I',
          min: ampereBalanceConstants.currentMin,
          max: ampereBalanceConstants.currentMax,
          step: 0.1,
          value: ampereBalanceConstants.defaultCurrent,
          unit: 'A'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '导体棒质量 m',
          min: ampereBalanceConstants.massMin,
          max: ampereBalanceConstants.massMax,
          step: 0.1,
          value: ampereBalanceConstants.defaultMass,
          unit: 'kg'
        }
      ]
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        {
          type: 'hint',
          key: 'formula',
          lines: ['Fₐ = BIL', '沿斜面合力 → 运动趋势']
        }
      ]
    }
  ]
};
