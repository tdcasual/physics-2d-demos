import type { ControlsSchema } from '../../platform/controls-schema';
import { electricPendulumConstants } from './scene.sim';
export const electricPendulumControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '情景模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          presets: [
            { id: 'balance', label: '准静态平衡' },
            { id: 'oscillate', label: '往复摆动' },
            { id: 'explore', label: '探索电压' }
          ],
          initialActive: 'balance'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'voltage',
          label: '板间电压 U',
          min: electricPendulumConstants.voltageMin,
          max: electricPendulumConstants.voltageMax,
          step: 0.05,
          value: electricPendulumConstants.defaultVoltage,
          unit: 'U₀'
        },
        {
          type: 'toggle',
          key: 'showForces',
          label: '显示受力分解',
          value: true
        },
        {
          type: 'toggle',
          key: 'showVelocity',
          label: '显示速度矢量',
          value: true
        }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['qE = mg tanθ', 'E = U / d', 'v²/2：动能读数']
        }
      ]
    }
  ]
};
