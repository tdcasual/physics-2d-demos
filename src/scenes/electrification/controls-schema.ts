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
            const p1 = document.createElement('p');
            p1.style.marginBottom = '10px';
            const s1 = document.createElement('strong');
            s1.style.color = 'var(--text-primary)';
            s1.textContent = '摩擦起电：';
            p1.append(
              s1,
              '两种不同的材料相互摩擦时，电子会从一种材料转移到另一种材料。'
            );
            const p2 = document.createElement('p');
            p2.style.marginBottom = '10px';
            const s2 = document.createElement('strong');
            s2.style.color = 'var(--text-primary)';
            s2.textContent = '接触起电：';
            p2.append(s2, '带电体与不带电体接触时，电荷会发生转移。');
            const p3 = document.createElement('p');
            const s3 = document.createElement('strong');
            s3.style.color = 'var(--text-primary)';
            s3.textContent = '感应起电：';
            p3.append(s3, '带电体靠近导体时，导体中的电荷会重新分布。');
            el.append(p1, p2, p3);
            mount.appendChild(el);
          }
        }
      ]
    }
  ]
};
