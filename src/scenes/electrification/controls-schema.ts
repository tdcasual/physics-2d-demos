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
          type: 'custom',
          key: 'info',
          label: '原理说明',
          render: (mount) => {
            const el = document.createElement('div');
            el.style.cssText =
              'font-size: 12px; line-height: 1.7; color: var(--text-secondary);';
            el.innerHTML = `
              <p style="margin-bottom: 10px;"><strong style="color: var(--text-primary);">摩擦起电：</strong>两种不同的材料相互摩擦时，电子会从一种材料转移到另一种材料。</p>
              <p style="margin-bottom: 10px;"><strong style="color: var(--text-primary);">接触起电：</strong>带电体与不带电体接触时，电荷会发生转移。</p>
              <p><strong style="color: var(--text-primary);">感应起电：</strong>带电体靠近导体时，导体中的电荷会重新分布。</p>
            `;
            mount.appendChild(el);
          }
        }
      ]
    }
  ]
};
