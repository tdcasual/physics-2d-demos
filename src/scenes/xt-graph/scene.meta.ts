import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['t', 'x', 'v'],
  renderHints: { contentScale: 1.6 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['preset']
  }
};

export const xtGraphMeta: SceneMeta = {
  id: 'xt-graph',
  title: '位置时间图像',
  path: '/src/pages/xt-graph.html',
  subject: '力学',
  concept: '运动图像',
  subConcepts: ['x-t 图线', '斜率即速度'],
  keywords: ['力学', '运动学', 'x-t图像', '位置时间图像'],
  objective: '理解 x–t 图线形状与运动状态的对应关系',
  description: '小车运动与位置—时间图线实时联动：图线的形状告诉你小车怎样运动',
  difficulty: 1,
  icon: '📈',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    speed: 1
  },
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
