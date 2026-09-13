import type { ControlsSchema } from '../../platform/controls-schema';

export const verticalCircleControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'model',
          columns: 2,
          presets: [
            { id: 'rope', label: '绳模型' },
            { id: 'rod', label: '杆模型' }
          ],
          initialActive: 'rope'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'vBottom',
          label: '最低点速度',
          min: 0,
          max: 35,
          step: 0.5,
          value: 23.5,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'theta',
          label: '位置角 θ',
          min: -180,
          max: 180,
          step: 1,
          value: -51,
          unit: '°'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showVectors', label: '显示受力', value: true },
        { type: 'toggle', key: 'showPath', label: '显示轨道', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['v² = v₀² − 2gR(1 + cosθ)', '绳：v顶 ≥ √gR', '杆：v顶可为 0']
        }
      ]
    }
  ]
};
