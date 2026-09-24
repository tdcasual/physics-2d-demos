import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const workspaceCss = readFileSync(
  join(root, 'src/styles/capability/data-workspace.css'),
  'utf8'
);
const themeCss = readFileSync(join(root, 'src/styles/themes.css'), 'utf8');

function ruleBody(css: string, header: string): string {
  const start = css.indexOf(header);
  expect(start, header).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`unclosed rule: ${header}`);
}

function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(input: string): Rgba {
  const hex = input.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const value = Number.parseInt(hex[1], 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
      a: 1
    };
  }
  const rgb = input.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i
  );
  if (!rgb) throw new Error(`unparsed color ${input}`);
  return {
    r: Number(rgb[1]),
    g: Number(rgb[2]),
    b: Number(rgb[3]),
    a: rgb[4] == null ? 1 : Number(rgb[4])
  };
}

function composite(front: Rgba, back: Rgba): Rgba {
  const a = front.a + back.a * (1 - front.a);
  const channel = (fg: number, bg: number) =>
    a === 0 ? 0 : (fg * front.a + bg * back.a * (1 - front.a)) / a;
  return {
    r: channel(front.r, back.r),
    g: channel(front.g, back.g),
    b: channel(front.b, back.b),
    a
  };
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function contrast(fg: Rgba, bg: Rgba): number {
  const lum = (color: Rgba) =>
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b);
  const lighter = Math.max(lum(fg), lum(bg));
  const darker = Math.min(lum(fg), lum(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('data-workspace readability contract', () => {
  it('locks the three classroom type tiers', () => {
    const base = declarations(
      ruleBody(workspaceCss, '.layout-master.is-data-workspace {')
    );
    const desk = declarations(
      ruleBody(
        workspaceCss,
        '@media (min-width: 1100px) and (min-height: 640px)'
      )
    );
    const projection = declarations(
      ruleBody(
        workspaceCss,
        '@media (min-width: 1600px) and (min-height: 900px)'
      )
    );

    expect(base['dw-type-title']).toBe('20px');
    expect(base['dw-type-table']).toBe('16px');
    expect(base['dw-type-review']).toBe('16px');
    expect(base['dw-type-input']).toBe('16px');
    expect(base['dw-type-button']).toBe('16px');
    expect(base['dw-type-status']).toBe('16px');
    expect(base['dw-canvas-title']).toBe('18');
    expect(base['dw-canvas-tick']).toBe('16');
    expect(base['dw-canvas-axis']).toBe('16');

    expect(desk['dw-type-title']).toBe('24px');
    expect(desk['dw-type-table']).toBe('18px');
    expect(desk['dw-type-review']).toBe('18px');
    expect(desk['dw-type-input']).toBe('18px');
    expect(desk['dw-type-button']).toBe('18px');
    expect(desk['dw-type-status']).toBe('18px');
    expect(desk['dw-type-known-label']).toBe('18px');
    expect(desk['dw-canvas-title']).toBe('20');
    expect(desk['dw-canvas-tick']).toBe('18');
    expect(desk['dw-canvas-axis']).toBe('18');

    expect(projection['dw-type-title']).toBe('52px');
    expect(projection['dw-type-known-label']).toBe('36px');
    expect(projection['dw-type-known-value']).toBe('42px');
    expect(projection['dw-type-hint']).toBe('34px');
    expect(projection['dw-type-table']).toBe('36px');
    expect(projection['dw-type-review']).toBe('36px');
    expect(projection['dw-type-input']).toBe('36px');
    expect(projection['dw-type-button']).toBe('36px');
    expect(projection['dw-type-status']).toBe('36px');
    expect(projection['dw-type-result']).toBe('36px');
    expect(projection['dw-type-result-value']).toBe('42px');
    expect(projection['dw-canvas-title']).toBe('40');
    expect(projection['dw-canvas-tick']).toBe('32');
    expect(projection['dw-canvas-axis']).toBe('36');
    expect(workspaceCss).not.toMatch(/--dw-type-status,\s*14px/);
    expect(workspaceCss).toMatch(
      /\.data-workspace-status\s*\{[^}]*font-size:\s*var\(--dw-type-status,\s*16px\)/
    );
  });

  it('keeps a content-fit split, a 36px separator hit area, and horizontal scrollports', () => {
    expect(workspaceCss).toContain("data-split-mode='manual'");
    expect(workspaceCss).toContain('flex: 0 1 auto;');
    expect(workspaceCss).toContain('max-height: 72%;');
    expect(workspaceCss).toMatch(
      /\.data-workspace-splitter\s*\{[^}]*flex:\s*0\s*0\s*36px;[^}]*min-height:\s*36px;/s
    );
    expect(workspaceCss).toContain('.data-workspace-splitter:focus-visible');
    expect(workspaceCss).toContain('.data-workspace-input:focus-visible');
    expect(workspaceCss).toContain('.data-workspace-check:focus-visible');
    expect(workspaceCss).toMatch(
      /\.data-workspace-table-wrap\s*\{[^}]*overflow-x:\s*auto;/s
    );
    expect(workspaceCss).not.toMatch(
      /\.data-workspace-table-wrap[^{]*\{[^}]*overflow-x:\s*hidden/s
    );
    expect(workspaceCss).toMatch(
      /\.data-workspace-check\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s
    );
    expect(workspaceCss).toMatch(
      /\.data-workspace-input\s*\{[^}]*min-height:\s*44px;/s
    );
  });

  it('scopes the flat ticker ruler and keeps a short chart split usable', () => {
    const clampAt = workspaceCss.indexOf('height: clamp(240px, 28vh, 320px)');
    expect(clampAt).toBeGreaterThan(0);
    expect(workspaceCss.slice(clampAt - 500, clampAt)).toContain(
      "[data-scene-id='ticker-tape']"
    );
    expect(
      workspaceCss.match(/height: clamp\(240px, 28vh, 320px\)/g)
    ).toHaveLength(1);
    expect(workspaceCss).not.toContain('height: max-content');

    const short = ruleBody(workspaceCss, '@media (max-height: 520px)');
    expect(short).not.toMatch(/overflow:\s*hidden/);
    expect(short).not.toMatch(/margin-(top|bottom):\s*-/);
    expect(short).not.toContain('4.25rem');
    expect(short).toContain('overflow-y: auto');
    expect(short).toContain("data-split-mode='manual'");
    expect(short).toContain('flex: 0 0 var(--dw-split, 33%)');
    expect(short).toContain('max-height: none');

    expect(workspaceCss.slice(clampAt, clampAt + 400)).toContain(
      'max-height: none'
    );
  });

  it('keeps status and body text at least 4.5:1 on both theme backgrounds', () => {
    const light = declarations(
      ruleBody(themeCss, ":root,\n[data-theme='light']")
    );
    const dark = declarations(ruleBody(themeCss, "[data-theme='dark']"));
    const pairs = [
      ['light', light],
      ['dark', dark]
    ] as const;

    for (const [name, tokens] of pairs) {
      const primary = parseColor(tokens['bg-primary']);
      const panel = composite(parseColor(tokens['bg-secondary']), primary);
      const surfaces = [
        ['primary', primary],
        ['panel', panel]
      ] as const;
      for (const [surfaceName, surface] of surfaces) {
        for (const token of [
          'status-ok',
          'danger',
          'text-primary',
          'text-secondary'
        ]) {
          const ratio = contrast(parseColor(tokens[token]), surface);
          expect(
            ratio,
            `${name} ${token} on ${surfaceName} (${tokens[token]} / ${tokens[surfaceName === 'primary' ? 'bg-primary' : 'bg-secondary']})`
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
