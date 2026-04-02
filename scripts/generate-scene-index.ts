import { writeFileSync } from 'fs';
import { resolve } from 'path';

interface SceneMeta {
  id: string;
  title: string;
  path: string;
  subject: string;
  concept: string;
  subConcepts: string[];
}

export function toSceneIndex(scenes: SceneMeta[]) {
  return scenes
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(s => ({
      id: s.id,
      title: s.title,
      path: s.path,
      subject: s.subject,
      concept: s.concept,
      subConcepts: s.subConcepts,
    }));
}

const scenes = [
  { id: 'projectile', title: '抛体运动', path: '/scenes/projectile/', subject: '力学', concept: '曲线运动', subConcepts: ['速度分解'] },
  { id: 'chase-meet', title: '追及相遇', path: '/scenes/chase-meet/', subject: '力学', concept: '相对运动', subConcepts: ['v-t图像'] },
  { id: 'field-lines', title: '电场分布', path: '/scenes/field-lines/', subject: '电磁学', concept: '电场分布', subConcepts: ['场线疏密'] },
  { id: 'emf-analogy', title: '电磁类比', path: '/scenes/emf-analogy/', subject: '电磁学', concept: '电磁类比', subConcepts: ['类比推理'] },
  { id: 'electrification', title: '静电感应', path: '/scenes/electrification/', subject: '电磁学', concept: '静电感应', subConcepts: ['摩擦起电'] },
  { id: 'vt-integral', title: 'v-t图像', path: '/scenes/vt-integral/', subject: '方法', concept: '图像法', subConcepts: ['微积分'] },
  { id: 'spring-oscillator', title: '弹簧振子', path: '/scenes/spring-oscillator/', subject: '力学', concept: '简谐运动', subConcepts: ['周期频率'] },
];

const index = {
  scenes: toSceneIndex(scenes),
  generatedAt: new Date().toISOString(),
};

writeFileSync(
  resolve(process.cwd(), 'dist/scene-index.json'),
  JSON.stringify(index, null, 2)
);

console.log('Scene index generated');
