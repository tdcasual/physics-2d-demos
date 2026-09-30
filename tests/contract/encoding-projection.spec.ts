/**
 * 编码投影抽查（v13 Wave J J2 / P2-2）
 *
 * 无 syncFromScene 的场景：toggle/select/scene-selector 的 getParams 类型
 * 必须与 fieldTypes 可投影对齐。0/1 vs bool、1 vs 'scene1' 类编码必须有 decode。
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import {
  EXISTING_SPECIAL_HANDLE_FORM_IDS,
  EXISTING_SPECIAL_HANDLE_FORMS
} from '../helpers/special-handle-forms';

const ROOT = resolve(process.cwd());
const SCENES_DIR = resolve(ROOT, 'src/scenes');

const VALUE_ALIGN_TYPES = new Set(['toggle', 'select', 'scene-selector']);

function listSceneIds(): string[] {
  return readdirSync(SCENES_DIR)
    .filter(
      (name) =>
        statSync(join(SCENES_DIR, name)).isDirectory() &&
        existsSync(join(SCENES_DIR, name, 'page.ts'))
    )
    .sort();
}

function readScene(id: string, name: string): string {
  const file = join(SCENES_DIR, id, name);
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function handleHasSyncFromScene(id: string): boolean {
  const page = readScene(id, 'page.ts');
  const controls = readScene(id, 'controls.ts');
  return /\bsyncFromScene\b/.test(page) || /\bsyncFromScene\b/.test(controls);
}

function propertyKey(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

function collectSchemaFields(
  sourceText: string
): Array<{ key: string; type: string }> {
  if (!sourceText) return [];
  const sourceFile = ts.createSourceFile(
    'schema.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const fields: Array<{ key: string; type: string }> = [];

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      let type: string | undefined;
      let key: string | undefined;
      for (const prop of node.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const name = propertyKey(prop.name);
        if (name === 'type' && ts.isStringLiteral(prop.initializer)) {
          type = prop.initializer.text;
        }
        if (name === 'key' && ts.isStringLiteral(prop.initializer)) {
          key = prop.initializer.text;
        }
      }
      if (type && key && VALUE_ALIGN_TYPES.has(type)) {
        fields.push({ key, type });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return fields;
}

function typeText(node: ts.TypeNode | undefined): string {
  if (!node) return '';
  return node.getText();
}

function collectNamedTypeProps(
  sources: string[],
  typeName: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const text of sources) {
    const sourceFile = ts.createSourceFile(
      'types.ts',
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const visit = (node: ts.Node): void => {
      if (
        (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        node.name.text === typeName
      ) {
        const members = ts.isTypeAliasDeclaration(node)
          ? ts.isTypeLiteralNode(node.type)
            ? node.type.members
            : undefined
          : node.members;
        if (!members) return;
        for (const member of members) {
          if (!ts.isPropertySignature(member) || !member.name) continue;
          const key = propertyKey(member.name);
          if (!key) continue;
          out[key] = typeText(member.type);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return out;
}

function namedAliasText(sources: string[], typeName: string): string {
  for (const text of sources) {
    const sourceFile = ts.createSourceFile(
      'alias.ts',
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    let found = '';
    const visit = (node: ts.Node): void => {
      if (found) return;
      if (ts.isTypeAliasDeclaration(node) && node.name.text === typeName) {
        found = node.type.getText();
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    if (found) return found;
  }
  return typeName;
}

function collectGetParamsPropTypes(id: string): Record<string, string> {
  const entry = readScene(id, 'scene.entry.ts');
  const sim = readScene(id, 'scene.sim.ts');
  const sources = [entry, sim];
  const out: Record<string, string> = {};
  const sourceFile = ts.createSourceFile(
    'entry.ts',
    entry,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const visit = (node: ts.Node): void => {
    if (
      ts.isMethodDeclaration(node) ||
      ts.isMethodSignature(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isPropertySignature(node) ||
      ts.isFunctionDeclaration(node)
    ) {
      const name =
        node.name && ts.isIdentifier(node.name) ? node.name.text : '';
      if (name === 'getParams') {
        const typeNode =
          'type' in node ? (node.type as ts.TypeNode | undefined) : undefined;
        if (typeNode && ts.isTypeLiteralNode(typeNode)) {
          for (const member of typeNode.members) {
            if (!ts.isPropertySignature(member) || !member.name) continue;
            const key = propertyKey(member.name);
            if (!key) continue;
            out[key] = typeText(member.type);
          }
        } else if (typeNode && ts.isTypeReferenceNode(typeNode)) {
          const ref = typeNode.typeName.getText();
          Object.assign(out, collectNamedTypeProps(sources, ref));
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (const [key, declared] of Object.entries(out)) {
    const trimmed = declared.trim();
    if (/^[A-Z][A-Za-z0-9_]*$/.test(trimmed)) {
      out[key] = namedAliasText(sources, trimmed);
    }
  }
  return out;
}

function looksBoolean(type: string): boolean {
  return /^\s*boolean\s*$/.test(type);
}

function looksNumber(type: string): boolean {
  return /^\s*number\s*$/.test(type);
}

function looksStringy(type: string): boolean {
  if (!type) return false;
  if (/\bstring\b/.test(type)) return true;
  if (/'[^']+'/.test(type) || /"[^"]+"/.test(type)) return true;
  return false;
}

function hasToggleDecode(page: string, key: string): boolean {
  const window = page;
  return (
    new RegExp(`asBool\\([^)]*${key}`).test(window) ||
    new RegExp(`Boolean\\([^)]*${key}`).test(window) ||
    new RegExp(`${key}[^\\n]{0,80}!==\\s*0`).test(window) ||
    new RegExp(`Number\\([^)]*${key}[^)]*\\)\\s*!==\\s*0`).test(window) ||
    /asBool\(/.test(window)
  );
}

function hasSelectorDecode(page: string, key: string): boolean {
  return (
    new RegExp(`decode\\w*\\([^)]*${key}`).test(page) ||
    new RegExp(`String\\([^)]*${key}`).test(page) ||
    new RegExp(`scene\\$\\{`).test(page) ||
    /decodeVtSceneSelectorId|decode\w+Selector/.test(page)
  );
}

describe('encoding projection (J2)', () => {
  const sceneIds = listSceneIds();

  it('EXISTING_SPECIAL_HANDLE_FORMS is the exact frozen set', () => {
    expect(Object.keys(EXISTING_SPECIAL_HANDLE_FORMS).sort()).toEqual(
      [...EXISTING_SPECIAL_HANDLE_FORM_IDS].sort()
    );
    expect(EXISTING_SPECIAL_HANDLE_FORM_IDS).toEqual([
      'electrification',
      'single-loop',
      'spring-oscillator'
    ]);
  });

  it('toggle/selector getParams types align with fieldTypes, or have decode', () => {
    const mismatches: string[] = [];
    for (const id of sceneIds) {
      if (handleHasSyncFromScene(id)) continue;
      const schema =
        readScene(id, 'controls-schema.ts') +
        '\n' +
        readScene(id, 'controls.ts');
      const fields = collectSchemaFields(schema);
      if (fields.length === 0) continue;
      const paramTypes = collectGetParamsPropTypes(id);
      const page = readScene(id, 'page.ts');
      for (const field of fields) {
        const declared = paramTypes[field.key];
        if (!declared) continue;
        if (field.type === 'toggle') {
          if (looksBoolean(declared)) continue;
          if (looksNumber(declared) && hasToggleDecode(page, field.key)) {
            continue;
          }
          mismatches.push(
            `${id}: toggle "${field.key}" getParams type ${declared} needs boolean or decode`
          );
          continue;
        }
        if (field.type === 'select' || field.type === 'scene-selector') {
          if (looksStringy(declared)) continue;
          if (looksNumber(declared) && hasSelectorDecode(page, field.key)) {
            continue;
          }
          mismatches.push(
            `${id}: ${field.type} "${field.key}" getParams type ${declared} needs string id or decode`
          );
        }
      }
    }
    expect(mismatches, mismatches.join('\n')).toEqual([]);
  });
});
