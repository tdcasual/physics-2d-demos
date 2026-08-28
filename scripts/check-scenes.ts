import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { UTILITY_PAGES } from './utility-pages';

const root = process.cwd();
const scenesDir = join(root, 'src/scenes');
const pagesDir = join(root, 'src/pages');

const requiredSceneFiles = [
  'scene.meta.ts',
  'scene.sim.ts',
  'scene.view.ts',
  'scene.entry.ts',
  'page.ts'
];

type SceneCheckResult = {
  id: string;
  errors: string[];
};

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function readStringProperty(
  source: string,
  fileName: string,
  propertyName: string
): string | null {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  let value: string | null = null;

  const visit = (node: ts.Node): void => {
    if (
      value === null &&
      ts.isPropertyAssignment(node) &&
      ((ts.isIdentifier(node.name) && node.name.text === propertyName) ||
        (ts.isStringLiteral(node.name) && node.name.text === propertyName)) &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      value = node.initializer.text;
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return value;
}

function listSceneIds(): string[] {
  return readdirSync(scenesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function hasControlsFile(scenePath: string): boolean {
  return (
    existsSync(join(scenePath, 'controls-schema.ts')) ||
    existsSync(join(scenePath, 'controls.ts'))
  );
}

function checkSceneHtml(id: string): string[] {
  const htmlPath = join(pagesDir, `${id}.html`);
  if (!existsSync(htmlPath)) {
    return [`missing src/pages/${id}.html`];
  }
  const errors: string[] = [];
  const html = read(htmlPath);

  if (!html.includes('id="app"')) {
    errors.push(`${id}.html must contain an #app mount element`);
  }
  const expectedScript = `<script type="module" src="../scenes/${id}/page.ts"></script>`;
  if (!html.includes(expectedScript)) {
    errors.push(
      `${id}.html must load the scene entry via ${expectedScript} (relative src)`
    );
  }
  // 死标记：bootScenePage 只挂载 #app，不读取这些历史遗留节点
  for (const dead of ['scene-canvas', 'id="controls"']) {
    if (html.includes(dead)) {
      errors.push(`${id}.html contains dead markup: ${dead}`);
    }
  }
  // 防闪烁脚本由 vite-plugin-theme-noflash 单源注入，HTML 中禁止手抄
  if (html.includes('阻止 theme flash')) {
    errors.push(
      `${id}.html must not hand-copy the anti-flash script (injected by vite-plugin-theme-noflash)`
    );
  }
  return errors;
}

function checkScene(id: string): SceneCheckResult {
  const scenePath = join(scenesDir, id);
  const errors: string[] = [];

  for (const file of requiredSceneFiles) {
    if (!existsSync(join(scenePath, file))) {
      errors.push(`missing ${file}`);
    }
  }

  if (!hasControlsFile(scenePath)) {
    errors.push('missing controls-schema.ts or controls.ts');
  }

  errors.push(...checkSceneHtml(id));

  const metaPath = join(scenePath, 'scene.meta.ts');
  if (existsSync(metaPath)) {
    const source = read(metaPath);
    if (source.includes('../../app/') || source.includes('../../ui/')) {
      errors.push(
        'scene.meta.ts must import shared contracts from platform/core, not app/ui'
      );
    }
    const metaId = readStringProperty(source, metaPath, 'id');
    const metaPagePath = readStringProperty(source, metaPath, 'path');
    if (metaId !== id) {
      errors.push(
        `SceneMeta.id must be "${id}", got ${JSON.stringify(metaId)}`
      );
    }
    const expectedPagePath = `/src/pages/${id}.html`;
    if (metaPagePath !== expectedPagePath) {
      errors.push(
        `SceneMeta.path must be "${expectedPagePath}", got ${JSON.stringify(metaPagePath)}`
      );
    }
    if (!/\btestProfile\s*:/.test(source)) {
      errors.push('scene.meta.ts must declare testProfile');
    }
  }

  return { id, errors };
}

const results = listSceneIds().map(checkScene);
const failed = results.filter((result) => result.errors.length > 0);

// 反向检查：src/pages/*.html（排除工具页）必须有同名场景目录，
// 否则是孤儿 HTML（忘了删页面）或场景目录被误删（忘了删场景）。
const orphanErrors: string[] = [];
for (const entry of readdirSync(pagesDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const id = entry.name.replace(/\.html$/, '');
  if (UTILITY_PAGES.has(id)) continue;
  if (!existsSync(join(scenesDir, id))) {
    orphanErrors.push(
      `src/pages/${entry.name} has no matching scene directory src/scenes/${id}/` +
        ' (orphan HTML or forgotten scene directory deletion)'
    );
  }
}

if (failed.length > 0 || orphanErrors.length > 0) {
  console.error('Scene structure check failed:');
  for (const result of failed) {
    console.error(`- ${result.id}`);
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }
  for (const error of orphanErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Scene structure check passed (${results.length} scenes).`);
