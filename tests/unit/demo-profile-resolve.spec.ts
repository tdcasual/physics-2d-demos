import { describe, expect, it } from 'vitest';
import {
  resolveDemoProfile,
  TASK_MASTERS,
  type SceneDemoProfile
} from '../../src/platform/demo-profile';
import { filterPresentationReadout } from '../../src/app/scene-adapter';

const hints = { contentScale: 1.5 };

describe('resolveDemoProfile', () => {
  it('uses UNMIGRATED table and ignores raw collapsed for tortoise-hare', () => {
    const input: SceneDemoProfile = {
      controlPanel: 'collapsed',
      readoutPanel: 'docked-bottom',
      renderHints: hints
    };
    const resolved = resolveDemoProfile(input, { sceneId: 'tortoise-hare' });
    expect(resolved.controlPanel).toBe('hidden');
    expect(resolved.readoutPanel).toBe('docked-bottom');
    expect(resolved.lessonTask).toBe('unmigrated');
  });

  it('does not fill ganshe graphPanel while unmigrated', () => {
    const resolved = resolveDemoProfile(
      { controlPanel: 'minimal', readoutPanel: 'overlay', renderHints: hints },
      { sceneId: 'ganshe' }
    );
    expect(resolved.graphPanel).toBeUndefined();
  });

  it('does not hide ticker-tape transport while unmigrated', () => {
    const resolved = resolveDemoProfile(
      {
        controlPanel: 'minimal',
        readoutPanel: 'docked-bottom',
        renderHints: hints
      },
      { sceneId: 'ticker-tape' }
    );
    expect(resolved.transport).toBeUndefined();
    expect(resolved.graphPanel).toBeUndefined();
  });

  it('unknown id warns and falls back to raw fields without throwing', () => {
    const resolved = resolveDemoProfile(
      { controlPanel: 'full', readoutPanel: 'overlay', renderHints: hints },
      { sceneId: 'brand-new-lab' }
    );
    expect(resolved.controlPanel).toBe('full');
    expect(resolved.lessonTask).toBe('unmigrated');
  });

  it('migrated lecture uses master graph hidden unless overridden', () => {
    const resolved = resolveDemoProfile(
      {
        lessonTask: 'lecture',
        renderHints: hints,
        interactionHints: { visibleControlKeys: ['v0'] }
      },
      { sceneId: 'projectile' }
    );
    expect(resolved.controlPanel).toBe(TASK_MASTERS.lecture.controlPanel);
    expect(resolved.graphPanel).toBe('hidden');
    expect(resolved.visibleControlKeys).toEqual(['v0']);
  });

  it('ganshe lecture override keeps graph visible', () => {
    const resolved = resolveDemoProfile(
      {
        lessonTask: 'lecture',
        graphPanel: 'visible',
        renderHints: hints
      },
      { sceneId: 'ganshe' }
    );
    expect(resolved.graphPanel).toBe('visible');
  });

  it('instrument master omits graphPanel', () => {
    const resolved = resolveDemoProfile(
      {
        lessonTask: 'instrument',
        transport: 'visible',
        renderHints: hints
      },
      { sceneId: 'ticker-tape' }
    );
    expect(resolved.graphPanel).toBeUndefined();
    expect(resolved.transport).toBe('visible');
    expect(resolved.readoutPanel).toBe('hidden');
  });
});

describe('filterPresentationReadout', () => {
  const items = [
    { key: 't', label: '时间 t', value: '0' },
    { key: 'mode', label: '显示模式', value: '演示模式' },
    { label: '主题', value: '白天' }
  ];

  it('drops denylist rows when readoutKeys is empty', () => {
    const resolved = resolveDemoProfile(
      {
        controlPanel: 'hidden',
        readoutPanel: 'docked-bottom',
        renderHints: hints
      },
      { sceneId: 'chase-meet' }
    );
    const next = filterPresentationReadout(items, 'presentation', resolved);
    expect(next.map((i) => i.label)).toEqual(['时间 t']);
  });

  it('filters by readoutKeys when provided', () => {
    const resolved = resolveDemoProfile(
      {
        lessonTask: 'lecture',
        readoutKeys: ['t'],
        renderHints: hints
      },
      { sceneId: 'projectile' }
    );
    const next = filterPresentationReadout(items, 'presentation', resolved);
    expect(next).toEqual([items[0]]);
  });
});
