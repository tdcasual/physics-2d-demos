import type { ControlsSchema } from '../../platform/controls-schema';
import {
  CHARGE_PROFILES,
  CHARGE_PROFILE_LABELS,
  CHARGE_STRIPS_DEFAULT,
  CHARGE_STRIPS_MAX,
  CHARGE_STRIPS_MIN
} from './charge-model';

/** 电荷量模式专属卡片标题（page.ts 按模式显隐） */
export const METAL_ROD_CHARGE_SECTION = '微元法求电荷量';
/** 只对动力学模式（阻尼滑行 / 恒力加速）有意义的控件 */
export const METAL_ROD_DYNAMICS_KEYS = ['mass', 'initialVelocity'] as const;

export const metalRodControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '运动模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'coast',
          presets: [
            { id: 'coast', label: '初速度阻尼滑行' },
            { id: 'pull', label: '恒定拉力加速' },
            { id: 'charge', label: '微元法求电荷量' }
          ]
        }
      ]
    },
    {
      title: METAL_ROD_CHARGE_SECTION,
      collapsed: false,
      fields: [
        {
          type: 'select',
          key: 'profile',
          label: '速度变化方式',
          value: '0',
          options: CHARGE_PROFILES.map((profile, index) => ({
            label: CHARGE_PROFILE_LABELS[profile],
            value: String(index)
          }))
        },
        {
          type: 'slider',
          key: 'strips',
          label: 'Δt 份数 n',
          min: CHARGE_STRIPS_MIN,
          max: CHARGE_STRIPS_MAX,
          step: 1,
          value: CHARGE_STRIPS_DEFAULT
        }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'magneticField',
          label: '磁感应强度 B',
          min: 0,
          max: 2,
          step: 0.1,
          value: 1,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'resistance',
          label: '回路总电阻 R',
          min: 0.5,
          max: 4,
          step: 0.1,
          value: 2,
          unit: 'Ω'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '金属棒质量 m',
          min: 0.2,
          max: 2,
          step: 0.1,
          value: 1,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'initialVelocity',
          label: '初始推入速度 v₀',
          min: 0,
          max: 24,
          step: 1,
          value: 20,
          unit: 'm/s'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: [
            'E = BLv',
            'I = E/R',
            'Fₐ = BIL，方向与 v 相反',
            'Δq = IΔt = BLΔx/R ⇒ q = BLx/R'
          ]
        }
      ]
    }
  ]
};
