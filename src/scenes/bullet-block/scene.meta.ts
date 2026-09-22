import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['momentum', 'common-speed', 'max-depth', 'heat'],
  renderHints: { contentScale: 1.3 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['speed', 'bulletMass', 'blockMass', 'resistance']
  }
};

export const bulletBlockMeta: SceneMeta = {
  id: 'bullet-block',
  title: '子弹打木块力学模型',
  path: '/src/pages/bullet-block.html',
  subject: '力学',
  concept: '动量守恒',
  subConcepts: ['碰撞过程', '能量转化'],
  keywords: ['子弹打木块', '动量守恒', '内能', 'v-t 图像'],
  objective: '观察子弹嵌入木块时的动量守恒与能量转化',
  description: '调节 v₀、m、M、f，观察共速、深度与内能',
  difficulty: 3,
  icon: '🎯',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'momentum',
  featured: false,
  defaultParams: { speed: 25, bulletMass: 1, blockMass: 5, resistance: 50 },
  urlSyncKeys: ['speed', 'bulletMass', 'blockMass', 'resistance'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
