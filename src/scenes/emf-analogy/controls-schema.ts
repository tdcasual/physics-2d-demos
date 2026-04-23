import type { ControlsSchema } from '../../platform/controls-schema';

export const emfAnalogyControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '系统开关',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'switch',
          columns: 2,
          buttons: [
            { key: 'on', label: '闭合开关', desc: 'ON' },
            { key: 'off', label: '断开开关', desc: 'OFF' }
          ]
        }
      ]
    },
    {
      title: '外电阻 R',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'tap',
          label: '阀门开度',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.5,
          unit: '(R↑)'
        }
      ]
    },
    {
      title: '播放控制',
      collapsed: false,
      fields: [
        {
          type: 'transport',
          key: 'transport',
          showPlay: true,
          showPause: true,
          showReset: true,
          showStep: true
        }
      ]
    },
    {
      title: '视图切换',
      collapsed: true,
      fields: [
        {
          type: 'button-grid',
          key: 'view',
          columns: 2,
          buttons: [
            { key: 'circuit', label: '电路视图' },
            { key: 'water', label: '水类比' }
          ]
        }
      ]
    },
    {
      title: '动画速度',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'speed',
          label: '播放速度',
          min: 0.1,
          max: 3,
          step: 0.1,
          value: 1,
          unit: 'x'
        }
      ]
    },
    {
      title: '重置',
      collapsed: true,
      fields: [
        {
          type: 'button-grid',
          key: 'reset',
          columns: 1,
          buttons: [{ key: 'reset', label: '重置系统' }]
        }
      ]
    }
  ]
};
