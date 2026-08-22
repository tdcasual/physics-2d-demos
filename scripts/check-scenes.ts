import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

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

  if (!existsSync(join(pagesDir, `${id}.html`))) {
    errors.push(`missing src/pages/${id}.html`);
  }

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

if (failed.length > 0) {
  console.error('Scene structure check failed:');
  for (const result of failed) {
    console.error(`- ${result.id}`);
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }
  process.exit(1);
}

console.log(`Scene structure check passed (${results.length} scenes).`);
