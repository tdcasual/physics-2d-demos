import type { ControlsSchema } from '../../platform/controls-schema';
import { alternatingElectricDeflectionConstants as C } from './scene.sim';

export const alternatingElectricDeflectionControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模型参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'voltageAmplitude',
          label: '电压幅值 U₀',
          min: C.voltageAmplitudeMin,
          max: C.voltageAmplitudeMax,
          step: 0.1,
          value: C.defaultVoltageAmplitude,
          unit: '归一化'
        },
        {
          type: 'slider',
          key: 'period',
          label: '周期 T',
          min: C.periodMin,
          max: C.periodMax,
          step: 0.1,
          value: C.defaultPeriod,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'plateGap',
          label: '板间距 d',
          min: C.plateGapMin,
          max: C.plateGapMax,
          step: 0.1,
          value: C.defaultPlateGap,
          unit: 'd'
        },
        {
          type: 'slider',
          key: 'flightDuration',
          label: '飞行时长',
          min: C.flightDurationMin,
          max: C.flightDurationMax,
          step: 0.1,
          value: C.defaultFlightDuration,
          unit: 'T'
        }
      ]
    },
    {
      title: '时序与电荷',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'releasePhase',
          label: '释放时刻 t₀/T',
          min: C.releasePhaseMin,
          max: C.releasePhaseMax,
          step: 0.05,
          value: C.defaultReleasePhase,
          unit: 'T'
        },
        {
          type: 'preset-group',
          key: 'charge',
          columns: 2,
          presets: [
            { id: 'positive', label: '正电荷 +q' },
            { id: 'negative', label: '负电荷 −q' }
          ],
          initialActive: 'positive'
        },
        {
          type: 'button-grid',
          key: 'timing',
          columns: 3,
          buttons: [
            { key: 't0', label: '0' },
            { key: 'tQuarter', label: 'T/4' },
            { key: 'tHalf', label: 'T/2' },
            { key: 'tThreeQuarter', label: '3T/4' },
            { key: 'refire', label: '重新发射' }
          ]
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showVectors',
          label: '速度与电场力',
          value: true
        },
        { type: 'toggle', key: 'showGhosts', label: '完整轨迹', value: true },
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
          lines: ['a₀ = |q|U₀/(md)', 'vₘ = a₀T/2', '水平匀速，竖直分段匀变速']
        }
      ]
    }
  ]
};
