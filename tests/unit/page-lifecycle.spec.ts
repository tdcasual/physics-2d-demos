import { describe, expect, it } from 'vitest';
import { createPageLifecycle } from '../../src/app/page-lifecycle';

describe('page lifecycle', () => {
  it('runs all disposers once', () => {
    const calls: string[] = [];
    const lifecycle = createPageLifecycle();
    lifecycle.onDispose(() => calls.push('a'));
    lifecycle.onDispose(() => calls.push('b'));
    lifecycle.dispose();
    lifecycle.dispose();
    expect(calls).toEqual(['a', 'b']);
  });
});
