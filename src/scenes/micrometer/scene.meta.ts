/**
 * 螺旋测微仪 — 测量工具演示
 */

import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'instrument',
  renderHints: {
    contentScale: 1.5,
    fontScale: 1.2,
    revealAnswer: false
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['preset', 'reveal']
  }
};

export const micrometerMeta: SceneMeta = {
  id: 'micrometer',
  title: '螺旋测微仪',
  path: '/src/pages/micrometer.html',
  subject: '方法',
  concept: '长度测量',
  subConcepts: ['螺旋测微仪', '读数方法'],
  keywords: ['螺旋测微仪', '千分尺', '长度测量', '读数', '仪器'],
  objective: '掌握螺旋测微仪的结构和读数方法',
  description: '通过模拟螺旋测微仪测量不同物体，理解螺旋测微读数原理',
  difficulty: 1,
  icon: '🔩',
  category: 'method',
  featured: false,
  defaultParams: {
    reading: 4.593
  },
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
