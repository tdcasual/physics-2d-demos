import type { ControlsSchema } from '../../platform/controls-schema';
import { oscilloscopeConstants as C } from './scene.sim';

export const oscilloscopeControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        {
          type: 'toggle',
          key: 'scanEnabled',
          label: 'X 轴扫描',
          value: true
        }
      ]
    },
    {
      title: '公式',
      collapsed: false,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['fᵧ = n · fₓ', 'n 为正整数时波形稳定']
        }
      ]
    },
    {
      title: '待测信号',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'signalAmplitude',
          label: '振幅 Aᵧ',
          min: C.ampMin,
          max: C.ampMax,
          step: 1,
          value: C.signalAmpDefault
        },
        {
          type: 'slider',
          key: 'signalFrequency',
          label: '频率 fᵧ',
          min: C.signalFreqMin,
          max: C.signalFreqMax,
          step: 10,
          value: C.signalFreqDefault,
          unit: 'Hz'
        }
      ]
    },
    {
      title: '扫描信号',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'scanAmplitude',
          label: '扫描幅度 Aₓ',
          min: C.ampMin,
          max: C.ampMax,
          step: 1,
          value: C.scanAmpDefault
        },
        {
          type: 'slider',
          key: 'scanFrequency',
          label: '扫描频率 fₓ',
          min: C.scanFreqMin,
          max: C.scanFreqMax,
          step: 10,
          value: C.scanFreqDefault,
          unit: 'Hz'
        }
      ]
    }
  ]
};
