import type { ControlsSchema } from '../../platform/controls-schema';

export const magneticConvergenceControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          presets: [
            { id: 'converge', label: '磁会聚' },
            { id: 'diverge', label: '磁发散' }
          ],
          initialActive: 'converge'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'radiusRatio',
          label: '轨道半径比 r / R',
          min: 0.6,
          max: 1.4,
          step: 0.1,
          value: 1
        },
        {
          type: 'slider',
          key: 'particleCount',
          label: '粒子数',
          min: 5,
          max: 11,
          step: 1,
          value: 7
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showField', label: '磁场标记', value: true },
        {
          type: 'button-grid',
          key: 'actions',
          columns: 2,
          buttons: [
            { key: 'emit', label: '发射粒子' },
            { key: 'clear', label: '清空' }
          ]
        }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['qvB = mv² / r', 'r = mv / |q|B', 'r = R → 理想会聚/发散']
        }
      ]
    }
  ]
};
