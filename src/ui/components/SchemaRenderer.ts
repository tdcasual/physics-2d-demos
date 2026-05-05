/**
 * 声明式控制渲染器
 *
 * 将 ControlsSchema 渲染为实际 DOM。
 */

import { createControlCard } from './ControlCard';
import {
  createSliderRow,
  createNumberInputRow,
  createTextInputRow,
  createSelectRow,
  createButtonGrid,
  createPresetButtonGroup,
  createTransportRow,
  createSceneSelector
} from './scene-controls';
import type {
  ControlsSchema,
  ControlField
} from '../../platform/controls-schema';

export interface SchemaRendererOptions {
  mount: HTMLElement;
  schema: ControlsSchema;
  onChange: (key: string, value: number | string | boolean) => void;
  onAction: (key: string) => void;
}

export interface SchemaRendererInstance {
  element: HTMLElement;
  setValue: (key: string, value: unknown) => void;
  getValue: <T>(key: string) => T | undefined;
  setActive: (key: string, id: string) => void;
  dispose: () => void;
}

export function renderSchema(
  options: SchemaRendererOptions
): SchemaRendererInstance {
  const { mount, schema, onChange, onAction } = options;
  mount.replaceChildren();

  const valueSetters = new Map<string, (value: unknown) => void>();
  const valueGetters = new Map<string, () => unknown>();
  const activeSetters = new Map<string, (id: string) => void>();
  const cleanupFns: Array<() => void> = [];

  schema.sections.forEach((section) => {
    const card = createControlCard(section.title, {
      defaultCollapsed: section.collapsed ?? false
    });

    // 判定此 section 是否应占满整行
    const needsFullWidth =
      section.span === 'full' ||
      section.fields.some((f) => f.type === 'slider' || f.type === 'text');
    if (needsFullWidth) {
      card.element.dataset.span = 'full';
    }

    section.fields.forEach((field) => {
      const { node, valueSetter, activeSetter, cleanup } = renderField(
        field,
        onChange,
        onAction
      );
      if (node) {
        card.body.appendChild(node);
      }
      if (valueSetter) valueSetters.set(field.key, valueSetter);
      if (activeSetter) activeSetters.set(field.key, activeSetter);
      if (cleanup) cleanupFns.push(cleanup);
    });

    mount.appendChild(card.element);
  });

  return {
    element: mount,
    setValue(key: string, value: unknown) {
      valueSetters.get(key)?.(value);
    },
    getValue<T>(key: string): T | undefined {
      return valueGetters.get(key)?.() as T | undefined;
    },
    setActive(key: string, id: string) {
      activeSetters.get(key)?.(id);
    },
    dispose() {
      cleanupFns.forEach((fn) => fn());
      mount.replaceChildren();
      valueSetters.clear();
      valueGetters.clear();
      activeSetters.clear();
    }
  };
}

interface RenderResult {
  node: HTMLElement | null;
  valueSetter?: (value: unknown) => void;
  valueGetter?: () => unknown;
  activeSetter?: (id: string) => void;
  cleanup?: () => void;
}

function renderField(
  field: ControlField,
  onChange: (key: string, value: number | string | boolean) => void,
  onAction: (key: string) => void
): RenderResult {
  switch (field.type) {
    case 'slider': {
      const row = createSliderRow(field.label, {
        min: field.min,
        max: field.max,
        step: field.step,
        value: field.value,
        unit: field.unit,
        onChange: (val) => onChange(field.key, val)
      });
      const input = row.querySelector('input');
      if (input) input.dataset.key = field.key;
      return {
        node: row,
        valueSetter: (value) => {
          if (input) {
            input.value = String(value);
            input.dispatchEvent(new Event('input'));
          }
        }
      };
    }

    case 'number': {
      const row = createNumberInputRow(
        field.label,
        {
          value: field.value,
          min: field.min,
          max: field.max,
          step: field.step,
          unit: field.unit
        },
        (val) => onChange(field.key, val)
      );
      const input = row.querySelector('input');
      return {
        node: row,
        valueGetter: () => (input ? parseFloat(input.value) : field.value)
      };
    }

    case 'text': {
      const row = createTextInputRow(
        field.label,
        { value: field.value, fontFamily: field.fontFamily },
        (val) => onChange(field.key, val)
      );
      const input = row.querySelector('input');
      return {
        node: row,
        valueGetter: () => (input ? input.value : field.value)
      };
    }

    case 'select':
      return {
        node: createSelectRow(field.label, {
          choices: field.options,
          value: field.value,
          onChange: (val) => onChange(field.key, val)
        })
      };

    case 'button':
      return {
        node: createButtonGrid(
          [{ label: field.label, onClick: () => onAction(field.key) }],
          1
        )
      };

    case 'preset-group': {
      const presetContainer = document.createElement('div');
      const preset = createPresetButtonGroup(presetContainer, field.presets, {
        initialActive: field.initialActive,
        columns: field.columns,
        onSelect: (id) => onChange(field.key, id)
      });
      return {
        node: presetContainer,
        activeSetter: (id) => preset.setActive(id)
      };
    }

    case 'transport': {
      const transportContainer = document.createElement('div');
      createTransportRow(transportContainer, {
        onPlay:
          field.showPlay !== false
            ? () => onAction(`${field.key}:play`)
            : undefined,
        onPause:
          field.showPause !== false
            ? () => onAction(`${field.key}:pause`)
            : undefined,
        onReset:
          field.showReset !== false
            ? () => onAction(`${field.key}:reset`)
            : undefined,
        onStep:
          field.showStep !== false
            ? () => onAction(`${field.key}:step`)
            : undefined
      });
      return { node: transportContainer };
    }

    case 'scene-selector': {
      const selectorContainer = document.createElement('div');
      const selector = createSceneSelector(selectorContainer, field.scenes, {
        initialActive: field.initialActive,
        onSelect: (id) => onChange(field.key, id)
      });
      return {
        node: selectorContainer,
        activeSetter: (id) => selector.setActive(id),
        cleanup: () => selector.dispose()
      };
    }

    case 'button-grid':
      return {
        node: createButtonGrid(
          field.buttons.map((b) => ({
            label: b.label,
            desc: b.desc,
            onClick: () => onAction(b.key)
          })),
          field.columns ?? 2
        )
      };

    case 'custom': {
      const customContainer = document.createElement('div');
      const cleanup = field.render(customContainer);
      return {
        node: customContainer,
        cleanup: cleanup ? () => cleanup() : undefined
      };
    }

    default:
      return { node: null };
  }
}
