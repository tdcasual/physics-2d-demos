import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function listSourceFiles(dir: string): string[] {
  const absoluteDir = resolve(root, dir);
  return readdirSync(absoluteDir).flatMap((entry) => {
    const absolutePath = resolve(absoluteDir, entry);
    const relativePath = `${dir}/${entry}`;
    if (statSync(absolutePath).isDirectory()) {
      return listSourceFiles(relativePath);
    }
    return /\.(ts|tsx)$/.test(entry) ? [relativePath] : [];
  });
}

function expectNoImports(
  source: string,
  forbidden: string[],
  file: string
): void {
  for (const target of forbidden) {
    expect(
      source.includes(`'${target}`) || source.includes(`"${target}`),
      `${file} must not import ${target}`
    ).toBe(false);
  }
}

describe('architecture boundaries', () => {
  it('scene.sim modules do not import app or ui layer', () => {
    const simSource = readSource('src/scenes/projectile/scene.sim.ts');
    expect(simSource.includes('../app/')).toBe(false);
    expect(simSource.includes('../../app/')).toBe(false);
    expect(simSource.includes('../ui/')).toBe(false);
    expect(simSource.includes('../../ui/')).toBe(false);
  });

  it('non-page scene modules do not import app or ui layer', () => {
    const sceneFiles = listSourceFiles('src/scenes').filter(
      (file) => !file.endsWith('/page.ts') && !file.endsWith('/controls.ts')
    );

    for (const file of sceneFiles) {
      const source = readSource(file);
      expectNoImports(
        source,
        ['../../app/', '../../../app/', '../../ui/', '../../../ui/'],
        file
      );
    }
  });

  it('core modules do not import app layer', () => {
    const coreFiles = listSourceFiles('src/core');

    for (const file of coreFiles) {
      const source = readSource(file);
      expectNoImports(
        source,
        [
          '../app/',
          '../../app/',
          '../ui/',
          '../../ui/',
          '../scenes/',
          '../../scenes/',
          '../platform/',
          '../../platform/',
          '../catalog/',
          '../../catalog/'
        ],
        file
      );
    }
  });

  it('ui and catalog modules respect their declared dependencies', () => {
    for (const file of listSourceFiles('src/ui')) {
      expectNoImports(
        readSource(file),
        [
          '../app/',
          '../../app/',
          '../scenes/',
          '../../scenes/',
          '../catalog/',
          '../../catalog/',
          '../instruments/',
          '../../instruments/'
        ],
        file
      );
    }
    for (const file of listSourceFiles('src/catalog')) {
      expectNoImports(
        readSource(file),
        [
          '../app/',
          '../../app/',
          '../ui/',
          '../../ui/',
          '../scenes/',
          '../../scenes/'
        ],
        file
      );
    }
  });
});
