import type { ControlsSchema } from '../../platform/controls-schema';
import { PROBE_N_DEFAULT, PROBE_N_MAX, PROBE_N_MIN } from './scene.sim';

export const fieldLinesControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '场景选择',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'scene',
          columns: 2,
          buttons: [
            { key: 'single', label: '单个电荷', desc: '单点电荷电场' },
            { key: 'like', label: '同种电荷', desc: '同种电荷电场' },
            { key: 'unlike', label: '异种电荷', desc: '异种电荷电场' },
            { key: 'custom', label: '自定义双电荷', desc: '自定义双电荷电场' }
          ]
        }
      ]
    },
    {
      title: '试探',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'n',
          label: '试探次数',
          min: PROBE_N_MIN,
          max: PROBE_N_MAX,
          step: 1,
          value: PROBE_N_DEFAULT,
          unit: '点'
        },
        {
          type: 'hint',
          key: 'n-hint',
          lines: [
            '电场线条数由电荷量决定，滑动只加密试探点。',
            '点足够密时，E 矢量连成电场线。'
          ]
        }
      ]
    },
    {
      title: '电荷控制',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'charge',
          columns: 2,
          buttons: [
            { key: 'add-positive', label: '+ 正电荷' },
            { key: 'add-negative', label: '- 负电荷' },
            { key: 'remove', label: '移除电荷' }
          ]
        }
      ]
    },
    {
      title: '自定义电荷',
      collapsed: true,
      fields: [
        {
          type: 'number',
          key: 'q1',
          label: 'Q₁',
          value: 1,
          min: -10,
          max: 10,
          step: 0.5
        },
        {
          type: 'number',
          key: 'q2',
          label: 'Q₂',
          value: -1,
          min: -10,
          max: 10,
          step: 0.5
        },
        { type: 'button', key: 'apply-charges', label: '应用电荷' }
      ]
    },
    {
      title: '重置',
      collapsed: true,
      fields: [{ type: 'button', key: 'reset', label: '重置场景' }]
    }
  ]
};
