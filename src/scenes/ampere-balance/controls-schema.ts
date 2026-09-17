import type { ControlsSchema } from '../../platform/controls-schema';
import { ampereBalanceConstants } from './scene.sim';

export const ampereBalanceControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '磁场与电流',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'fieldDirection',
          columns: 3,
          presets: [
            { id: 'up', label: '竖直向上 ↑' },
            { id: 'down', label: '竖直向下 ↓' },
            { id: 'right', label: '水平向右 →' },
            { id: 'left', label: '水平向左 ←' },
            { id: 'normalUp', label: '垂直斜面 ↗' },
            { id: 'normalDown', label: '垂直斜面 ↙' }
          ],
          initialActive: 'down'
        },
        {
          type: 'preset-group',
          key: 'currentDirection',
          columns: 2,
          presets: [
            { id: 'out', label: '⊙ 向外' },
            { id: 'in', label: '⊗ 向内' }
          ],
          initialActive: 'out'
        }
      ]
    },
    {
      title: '典型情景',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'preset',
          columns: 2,
          buttons: [
            { key: 'balance', label: '水平向左（近似平衡）' },
            { key: 'support-zero', label: '竖直向上（支持力为 0）' },
            { key: 'detach', label: '脱离斜面示例' },
            { key: 'reset', label: '恢复初始' }
          ]
        }
      ]
    },
    {
      title: '物理量',
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
          step: 0.01,
          value: ampereBalanceConstants.defaultMagneticField,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'current',
          label: '电流 I',
          min: ampereBalanceConstants.currentMin,
          max: ampereBalanceConstants.currentMax,
          step: 0.01,
          value: ampereBalanceConstants.defaultCurrent,
          unit: 'A'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '质量 m',
          min: ampereBalanceConstants.massMin,
          max: ampereBalanceConstants.massMax,
          step: 0.1,
          value: ampereBalanceConstants.defaultMass,
          unit: 'kg'
        }
      ]
    },
    {
      title: '规律',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'Fₐ = BIL（L⊥B）',
            '左手定则：B 穿掌心，四指沿 I',
            'f需 沿斜面平衡所需；N<0 则脱离'
          ]
        }
      ]
    }
  ]
};
