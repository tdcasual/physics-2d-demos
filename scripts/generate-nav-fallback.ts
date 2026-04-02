import { writeFileSync } from 'fs';
import { resolve } from 'path';

interface ScenePage {
  id: string;
  title: string;
  path: string;
  subject: string;
  concept: string;
  subConcepts: string[];
}

export function toFallbackScript(pages: ScenePage[]) {
  return `<script>window.__SCENE_FALLBACK__ = ${JSON.stringify(pages)}</script>`;
}

const pages = [
  { id: 'projectile', title: '抛体运动', path: '/scenes/projectile/', subject: '力学', concept: '曲线运动', subConcepts: ['速度分解'] },
  { id: 'chase-meet', title: '追及相遇', path: '/scenes/chase-meet/', subject: '力学', concept: '相对运动', subConcepts: ['v-t图像'] },
  { id: 'field-lines', title: '电场分布', path: '/scenes/field-lines/', subject: '电磁学', concept: '电场分布', subConcepts: ['场线疏密'] },
];

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>物理实验室</title>
  ${toFallbackScript(pages)}
  <meta http-equiv="refresh" content="0;url=/">
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;

writeFileSync(
  resolve(process.cwd(), 'dist/nav-fallback.html'),
  html
);

console.log('Nav fallback generated');
