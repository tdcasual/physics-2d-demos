/**
 * Canonical teaching-mode owner.
 *
 * DOM `data-mode`, SceneAdapter, inner scene, capability updates and the
 * bubbling `layout:modechange` event are projections of this object.
 */

import {
  resolveDemoProfile,
  type DemoRenderHints,
  type ResolvedDemoProfile
} from '../../platform/demo-profile';
import type { Scene } from './types';

export type TeachingMode = 'normal' | 'presentation';

export type ModeChangeReason =
  | 'toggle'
  | 'escape'
  | 'api'
  | 'new-scene'
  | 'page-entry'
  | 'reproject';

export type ModeChangePayload = {
  mode: TeachingMode;
  profile: ResolvedDemoProfile | null;
  reason: ModeChangeReason;
};

export type ModeOwnerHooks = {
  container: HTMLElement;
  getScene(): Scene | null;
  applyAdapterMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  emitMode(payload: ModeChangePayload): void;
  updateCapabilities(payload: ModeChangePayload): void;
};

export class ModeOwner {
  private _mode: TeachingMode = 'normal';
  private _version = 0;

  constructor(private readonly hooks: ModeOwnerHooks) {}

  getMode(): TeachingMode {
    return this._mode;
  }

  getVersion(): number {
    return this._version;
  }

  resetToNormal(reason: 'new-scene' | 'page-entry'): void {
    this.setMode('normal', reason);
  }

  setMode(mode: TeachingMode, reason: ModeChangeReason = 'api'): void {
    const unchanged = this._mode === mode && this._version > 0;
    this._mode = mode;
    if (unchanged) return;
    this._version += 1;
    this.project(reason);
  }

  /** Re-apply the current mode to a newly mounted layout shell. */
  project(reason: ModeChangeReason = 'reproject'): void {
    const mode = this._mode;
    const scene = this.hooks.getScene();
    const raw =
      mode === 'presentation' ? (scene?.getDemoProfile?.() ?? null) : null;
    const profile =
      mode === 'presentation' && raw && scene?.id
        ? resolveDemoProfile(raw, { sceneId: scene.id })
        : null;
    const hints = profile?.renderHints;
    const payload: ModeChangePayload = { mode, profile, reason };

    this.hooks.applyAdapterMode(mode, hints);
    this.hooks.container.setAttribute('data-mode', mode);
    this.hooks.emitMode(payload);
    this.hooks.container.dispatchEvent(
      new CustomEvent('layout:modechange', {
        detail: payload,
        bubbles: true
      })
    );
    this.hooks.updateCapabilities(payload);
  }
}
