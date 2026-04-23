import type { ControlsSchema } from '../../platform/controls-schema';

export const chaseMeetControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数设置',
      collapsed: false,
      fields: [
        {
          type: 'number',
          key: 'totalTime',
          label: '总时间 T',
          value: 10,
          min: 1,
          max: 120,
          step: 0.5,
          unit: 's'
        },
        {
          type: 'number',
          key: 'dt',
          label: '步长 Δt',
          value: 0.05,
          min: 0.005,
          max: 1,
          step: 0.005,
          unit: 's'
        },
        {
          type: 'number',
          key: 'x0A',
          label: '初始位置 A',
          value: 0,
          min: -100,
          max: 100,
          step: 0.5,
          unit: 'm'
        },
        {
          type: 'number',
          key: 'x0B',
          label: '初始位置 B',
          value: 10,
          min: -100,
          max: 100,
          step: 0.5,
          unit: 'm'
        },
        {
          type: 'text',
          key: 'vExprA',
          label: '速度函数 vA(t)',
          value: '2',
          fontFamily: 'monospace'
        },
        {
          type: 'text',
          key: 'vExprB',
          label: '速度函数 vB(t)',
          value: '1',
          fontFamily: 'monospace'
        },
        { type: 'button', key: 'apply', label: '应用参数' }
      ]
    },
    {
      title: '快速预设',
      collapsed: true,
      fields: [
        {
          type: 'button-grid',
          key: 'preset',
          columns: 1,
          buttons: [
            { key: 'uniform', label: '匀速追赶', desc: 'vA=2, vB=1' },
            { key: 'accelerated', label: '加速追赶', desc: 'vA=0.5t, vB=2' }
          ]
        }
      ]
    }
  ]
};
