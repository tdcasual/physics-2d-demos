import type { ControlsSchema } from '../../platform/controls-schema';

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
      title: '线密度',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'density',
          label: '电场线密度',
          min: 1,
          max: 100,
          step: 1,
          value: 10
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
