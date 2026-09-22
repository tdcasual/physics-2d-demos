import { afterEach, describe, expect, it } from 'vitest';
import { localPointerDelta, stageZoomOf } from '../../src/core/canvas-sizing';

describe('stageZoomOf', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('returns 1 when no ancestor carries data-stage-zoom', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(stageZoomOf(el)).toBe(1);
  });

  it('returns 1 for a detached element', () => {
    expect(stageZoomOf(document.createElement('div'))).toBe(1);
  });

  it('reads the zoom from the element itself', () => {
    const el = document.createElement('div');
    el.dataset.stageZoom = '1.5';
    expect(stageZoomOf(el)).toBe(1.5);
  });

  it('reads the zoom from an ancestor stage viewport', () => {
    const viewport = document.createElement('div');
    viewport.dataset.stageZoom = '2';
    const child = document.createElement('div');
    viewport.appendChild(child);
    document.body.appendChild(viewport);
    expect(stageZoomOf(child)).toBe(2);
  });

  it('climbs out of an open shadow root to the ancestor viewport', () => {
    // 两个仪器都是 open shadow root，指针绑在 shadow 内元素上；
    // closest()/parentElement 穿不过 shadow 边界，本测试防退回 closest()。
    const viewport = document.createElement('div');
    viewport.dataset.stageZoom = '2';
    const host = document.createElement('div');
    viewport.appendChild(host);
    document.body.appendChild(viewport);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);
    expect(inner.parentElement).toBeNull();
    expect(stageZoomOf(inner)).toBe(2);
  });

  it('stops at the shadow host chain top and returns 1 outside any viewport', () => {
    // chrome（viewport 兄弟节点）的 shadow 内容读不到 viewport 的 k
    const viewport = document.createElement('div');
    viewport.dataset.stageZoom = '2';
    const chrome = document.createElement('div');
    document.body.append(viewport, chrome);
    const shadow = chrome.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);
    expect(stageZoomOf(inner)).toBe(1);
  });

  it('degrades to 1 on non-finite or non-positive values', () => {
    const viewport = document.createElement('div');
    const child = document.createElement('div');
    viewport.appendChild(child);
    document.body.appendChild(viewport);
    for (const bad of ['nope', '0', '-2', 'NaN', 'Infinity']) {
      viewport.dataset.stageZoom = bad;
      expect(stageZoomOf(child)).toBe(1);
    }
  });
});

describe('localPointerDelta', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('passes deltas through when no stage zoom applies', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(localPointerDelta(el, 10, -6)).toEqual({ dx: 10, dy: -6 });
  });

  it('divides screen deltas by the stage zoom (k=2: drag 10px → 5 local px)', () => {
    const viewport = document.createElement('div');
    viewport.dataset.stageZoom = '2';
    const el = document.createElement('div');
    viewport.appendChild(el);
    document.body.appendChild(viewport);
    expect(localPointerDelta(el, 10, -6)).toEqual({ dx: 5, dy: -3 });
  });
});
