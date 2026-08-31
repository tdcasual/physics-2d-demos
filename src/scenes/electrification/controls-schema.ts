import type { ControlsSchema } from '../../platform/controls-schema';

export const electrificationControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '选择场景',
      collapsed: false,
      fields: [
        {
          type: 'scene-selector',
          key: 'scene',
          scenes: [
            {
              id: 'friction',
              label: '摩擦起电',
              desc: '两种不同材料摩擦时电子转移'
            },
            {
              id: 'contact',
              label: '接触起电',
              desc: '带电体与不带电体接触时电荷转移'
            },
            {
              id: 'induction',
              label: '感应起电',
              desc: '带电体靠近导体时电荷重新分布'
            }
          ],
          initialActive: 'friction'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'action',
          columns: 2,
          buttons: [
            { key: 'step', label: '执行步骤' },
            { key: 'reset', label: '重置' }
          ]
        }
      ]
    },
    {
      title: '原理说明',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'info',
          lines: [
            '摩擦起电：两种不同的材料相互摩擦时，电子会从一种材料转移到另一种材料。',
            '接触起电：带电体与不带电体接触时，电荷会发生转移。',
            '感应起电：带电体靠近导体时，导体中的电荷会重新分布。'
          ]
        }
      ]
    }
  ]
};
