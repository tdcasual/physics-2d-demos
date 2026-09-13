import type { ControlsSchema } from '../../platform/controls-schema';

export const oscilloscopeControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '待测信号',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'signalAmplitude',
          label: '振幅 Aᵧ',
          min: 5,
          max: 80,
          step: 1,
          value: 35
        },
        {
          type: 'slider',
          key: 'signalFrequency',
          label: '频率 fᵧ',
          min: 20,
          max: 400,
          step: 10,
          value: 210,
          unit: 'Hz'
        }
      ]
    },
    {
      title: '扫描信号',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'scanEnabled',
          label: '开启 X 轴扫描',
          value: true
        },
        {
          type: 'slider',
          key: 'scanAmplitude',
          label: '扫描幅度 Aₓ',
          min: 5,
          max: 80,
          step: 1,
          value: 40
        },
        {
          type: 'slider',
          key: 'scanFrequency',
          label: '扫描频率 fₓ',
          min: 10,
          max: 200,
          step: 10,
          value: 70,
          unit: 'Hz'
        }
      ]
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['fᵧ = n · fₓ', 'X 轴展开时间', 'Y 轴输入信号']
        }
      ]
    }
  ]
};
