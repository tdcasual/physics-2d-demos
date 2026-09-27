/**
 * A4：dynamic-circle / force-composition 去掉本地 200ms URL 定时器后，
 * 快速连续改参再换布局（dispose 控件、writer 仍在）或换场景（close writer）
 * 不得丢掉 pending patch。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createSceneParamWriter,
  resetUrlSyncOwners,
  resolveUrlSyncKeys
} from '../../src/app/url-sync';
import { createDynamicCircleScene } from '../../src/scenes/dynamic-circle/scene.entry';
import { dynamicCircleMeta } from '../../src/scenes/dynamic-circle/scene.meta';
import { createForceCompositionScene } from '../../src/scenes/force-composition/scene.entry';
import { forceCompositionMeta } from '../../src/scenes/force-composition/scene.meta';
import type { SceneMeta } from '../../src/platform/scene-contract';
import type { SceneParamWriter } from '../../src/app/scene-bootstrapper-types';

const captured = vi.hoisted(() => ({
  byId: new Map<
    string,
    (opts: {
      mount: HTMLElement;
      scene: unknown;
      scheduleRender?: () => void;
      sceneWriter?: SceneParamWriter;
    }) => { dispose: () => void }
  >()
}));

vi.mock('../../src/app/scene-bootstrapper', () => ({
  bootScenePage: (opts: {
    meta: { id: string };
    createControls: (o: {
      mount: HTMLElement;
      scene: unknown;
      scheduleRender?: () => void;
      sceneWriter?: SceneParamWriter;
    }) => { dispose: () => void };
  }) => {
    captured.byId.set(opts.meta.id, opts.createControls);
  }
}));

import '../../src/scenes/dynamic-circle/page';
import '../../src/scenes/force-composition/page';

const pendingDispose: Array<() => void> = [];

afterEach(() => {
  while (pendingDispose.length > 0) {
    pendingDispose.pop()?.();
  }
  resetUrlSyncOwners();
  window.history.replaceState({}, '', '/');
});

beforeEach(() => {
  resetUrlSyncOwners();
  window.history.replaceState({}, '', '/test.html');
});

function pageSource(id: string): string {
  return readFileSync(
    resolve(process.cwd(), `src/scenes/${id}/page.ts`),
    'utf8'
  );
}

function mountWithWriter(
  id: string,
  scene: { dispose?: () => void },
  meta: SceneMeta
): { handle: { dispose: () => void }; writer: SceneParamWriter } {
  const createControls = captured.byId.get(id);
  if (!createControls) throw new Error(`createControls missing for ${id}`);
  const writer = createSceneParamWriter(resolveUrlSyncKeys(meta));
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const handle = createControls({
    mount,
    scene,
    scheduleRender: vi.fn(),
    sceneWriter: writer
  });
  pendingDispose.push(() => {
    handle.dispose();
    mount.remove();
    scene.dispose?.();
    writer.close();
  });
  return { handle, writer };
}

describe('page URL timer removal (A4)', () => {
  it('dynamic-circle and force-composition have no local URL debounce', () => {
    for (const id of ['dynamic-circle', 'force-composition'] as const) {
      const source = pageSource(id);
      expect(source).not.toMatch(/\burlTimer\b/);
      expect(source).not.toMatch(/\bpendingUrl\b/);
      expect(source).not.toMatch(/\bqueueUrl\b/);
      expect(source).not.toMatch(/setTimeout\s*\(/);
      expect(source).toMatch(/writeOwnedSceneParams\s*\(\s*sceneWriter/);
    }
  });

  it('rapid param changes survive control remount (layout switch)', () => {
    const scene = createDynamicCircleScene();
    const { handle, writer } = mountWithWriter(
      'dynamic-circle',
      scene,
      dynamicCircleMeta
    );
    scene.setParams({ B: 0.12 });
    scene.setParams({ B: 0.18 });
    scene.setParams({ B: 0.22 });
    handle.dispose();
    writer.flush();
    expect(new URL(window.location.href).searchParams.get('B')).toBe('0.22');
  });

  it('owner debounce coalesces rapid writes into one replaceState', () => {
    vi.useFakeTimers();
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const scene = createDynamicCircleScene();
    mountWithWriter('dynamic-circle', scene, dynamicCircleMeta);
    const callsBefore = replaceSpy.mock.calls.length;
    scene.setParams({ B: 0.12 });
    scene.setParams({ B: 0.18 });
    scene.setParams({ B: 0.22 });
    expect(replaceSpy.mock.calls.length).toBe(callsBefore);
    vi.advanceTimersByTime(150);
    expect(replaceSpy.mock.calls.length).toBeLessThanOrEqual(callsBefore + 1);
    expect(new URL(window.location.href).searchParams.get('B')).toBe('0.22');
    replaceSpy.mockRestore();
    vi.useRealTimers();
  });

  it('rapid param changes survive scene leave (writer close)', () => {
    const scene = createForceCompositionScene();
    const { handle, writer } = mountWithWriter(
      'force-composition',
      scene,
      forceCompositionMeta
    );
    scene.setParams({ f1: 41 });
    scene.setParams({ f1: 48 });
    scene.setParams({ f1: 55 });
    handle.dispose();
    writer.close();
    expect(new URL(window.location.href).searchParams.get('f1')).toBe('55');
  });
});
