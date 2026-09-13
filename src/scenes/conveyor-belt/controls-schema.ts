import type { ControlsSchema } from '../../platform/controls-schema';
import { conveyorConstants } from './scene.sim';

export const conveyorControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '传送带参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'angle',
          label: '倾角 θ',
          min: conveyorConstants.angleMin,
          max: conveyorConstants.angleMax,
          step: 1,
          value: 30,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'beltSpeed',
          label: '速率 |v₀|',
          min: conveyorConstants.speedMin,
          max: conveyorConstants.speedMax,
          step: 0.5,
          value: 4,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'mu',
          label: '动摩擦因数 μ',
          min: conveyorConstants.muMin,
          max: conveyorConstants.muMax,
          step: 0.05,
          value: 0.8,
          unit: ''
        },
        {
          type: 'slider',
          key: 'blockMass',
          label: '物块质量 m',
          min: conveyorConstants.massMin,
          max: conveyorConstants.massMax,
          step: 0.1,
          value: 1,
          unit: 'kg'
        }
      ]
    },
    {
      title: '运动方向',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'direction',
          columns: 2,
          presets: [
            { id: 'up', label: '顺时针（向上）↗' },
            { id: 'down', label: '逆时针（向下）↙' }
          ],
          initialActive: 'up'
        }
      ]
    },
    {
      title: '释放与放置',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'releaseBottom',
          label: '在底端释放（v=0）',
          variant: 'primary'
        },
        {
          type: 'button',
          key: 'releaseTop',
          label: '在顶端释放（v=0）',
          variant: 'primary'
        },
        { type: 'button', key: 'reset', label: '重置', variant: 'secondary' }
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
            '共速后：静摩擦能否平衡 mg sinθ？',
            '点击斜面任意位置放置物块'
          ]
        }
      ]
    }
  ]
};
