import type { ControlsSchema } from '../../platform/controls-schema';

export const projectileLabControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验操作',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'operate',
          columns: 2,
          buttons: [
            { key: 'release', label: '释放小球' },
            { key: 'lowerPlate', label: '挡板下移一格' },
            { key: 'trace', label: '描出轨迹' },
            { key: 'newPaper', label: '换白纸' }
          ]
        }
      ]
    },
    {
      title: '实验设置',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'useLocator',
          label: '使用定位卡',
          value: true
        },
        {
          type: 'toggle',
          key: 'recordOrigin',
          label: '记录抛出点 O',
          value: true
        },
        {
          type: 'toggle',
          key: 'showLabels',
          label: '器材标注',
          value: true
        }
      ]
    },
    {
      title: '器材调节',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'releaseH',
          label: '释放高度 h',
          min: 4,
          max: 12,
          step: 0.5,
          value: 8,
          unit: 'cm'
        },
        {
          type: 'slider',
          key: 'chuteTilt',
          label: '斜槽末端倾角',
          min: -8,
          max: 8,
          step: 1,
          value: 0,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'plateY',
          label: '挡板位置 y',
          min: 6,
          max: 42,
          step: 1,
          value: 6,
          unit: 'cm'
        }
      ]
    }
  ]
};
