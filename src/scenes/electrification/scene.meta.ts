import type { SceneMeta } from '../types';

export const electrificationMeta: SceneMeta = {
  id: 'electrification',
  title: '静电起电演示',
  path: '/src/pages/electrification.html',
  subject: '电磁学',
  concept: '电荷转移',
  subConcepts: ['摩擦起电', '感应起电'],
  keywords: ['电磁学', '静电', '起电', '2D'],
  objective: '演示摩擦、感应、接触起电的步骤与结果',
  defaultParams: {
    scene: 0
  }
};
