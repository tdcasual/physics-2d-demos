/**
 * Lightweight data-workspace declarations.
 *
 * Layouts import only this module so non-opt-in scenes do not statically
 * pull the panel, platform engine, or scene-specific validation.
 */

import type { CapabilityDeclaration, LayoutConfig } from '../types';

export type DataWorkspaceUpdateData = {
  host: import('../../../platform/data-workspace').DataWorkspaceHost | null;
};

export function dataWorkspaceDeclarations(
  config: LayoutConfig
): CapabilityDeclaration[] {
  if (!config.dataWorkspace) return [];
  return [{ id: 'data-workspace' }];
}
