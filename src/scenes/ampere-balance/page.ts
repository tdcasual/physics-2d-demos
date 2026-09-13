import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { ampereBalanceControlsSchema } from './controls-schema';
import { ampereBalanceMeta } from './scene.meta';
import { createAmpereBalanceScene } from './scene.entry';
import {
  ampereBalanceConstants,
  type AmpereBalanceParams,
  type AmpereCurrentDirection,
  type AmpereFieldDirection
} from './scene.sim';

function asFieldDirection(value: unknown): AmpereFieldDirection {
  if (
    value === 'up' ||
    value === 'right' ||
    value === 'left' ||
    value === 'normalUp' ||
    value === 'normalDown'
  ) {
    return value;
  }
  if (value === 0 || value === '0') return 'up';
  if (value === 2 || value === '2') return 'right';
  if (value === 3 || value === '3') return 'left';
  if (value === 4 || value === '4') return 'normalUp';
  if (value === 5 || value === '5') return 'normalDown';
  return 'down';
}

function asCurrentDirection(value: unknown): AmpereCurrentDirection {
  return value === 'in' || value === 1 || value === '1' ? 'in' : 'out';
}

bootScenePage({
  meta: ampereBalanceMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('ampere-balance requires a canvas');
    const scene = createAmpereBalanceScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: ampereBalanceControlsSchema,
      onChange: (key, value) => {
        if (key === 'fieldDirection') {
          const direction = asFieldDirection(value);
          scene.setFieldDirection(direction);
          renderer.setActive(key, direction);
        } else if (key === 'currentDirection') {
          const direction = asCurrentDirection(value);
          scene.setCurrentDirection(direction);
          renderer.setActive(key, direction);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
        } else if (
          key === 'inclineAngle' ||
          key === 'magneticField' ||
          key === 'current' ||
          key === 'mass'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<AmpereBalanceParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (
          key === 'up' ||
          key === 'down' ||
          key === 'right' ||
          key === 'left' ||
          key === 'normalUp' ||
          key === 'normalDown'
        ) {
          scene.setFieldDirection(key);
          renderer.setActive('fieldDirection', key);
        } else if (key === 'out' || key === 'in') {
          scene.setCurrentDirection(key);
          renderer.setActive('currentDirection', key);
        } else if (key === 'balance') {
          scene.setParams({
            inclineAngle: 30,
            magneticField: 0.87,
            current: 4.6,
            mass: 0.8,
            fieldDirection: 'normalUp',
            currentDirection: 'out'
          });
          renderer.setActive('fieldDirection', 'normalUp');
          renderer.setActive('currentDirection', 'out');
        } else if (key === 'support-zero') {
          scene.setParams({
            inclineAngle: 30,
            magneticField: 1.74,
            current: 4.6,
            mass: 0.8,
            fieldDirection: 'right',
            currentDirection: 'out'
          });
          renderer.setActive('fieldDirection', 'right');
          renderer.setActive('currentDirection', 'out');
        } else if (key === 'detach') {
          scene.setParams({
            inclineAngle: 30,
            magneticField: 2.4,
            current: 4.6,
            mass: 0.8,
            fieldDirection: 'right',
            currentDirection: 'out'
          });
          renderer.setActive('fieldDirection', 'right');
          renderer.setActive('currentDirection', 'out');
        } else if (key === 'reset') {
          scene.reset();
          renderer.setValue(
            'inclineAngle',
            ampereBalanceConstants.defaultInclineAngle
          );
          renderer.setValue(
            'magneticField',
            ampereBalanceConstants.defaultMagneticField
          );
          renderer.setValue('current', ampereBalanceConstants.defaultCurrent);
          renderer.setValue('mass', ampereBalanceConstants.defaultMass);
          renderer.setValue('autoRun', true);
          renderer.setActive('fieldDirection', 'down');
          renderer.setActive('currentDirection', 'out');
        }
        render();
      }
    });
    return {
      setValue: (key: string, value: number | string | boolean) =>
        renderer.setValue(key, value),
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      dispose: () => renderer.dispose()
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'fieldDirection') {
        const direction = asFieldDirection(value);
        ctx.scene.setParams({ fieldDirection: direction });
        ctx.setControlValue(key, direction);
        return true;
      }
      if (key === 'currentDirection') {
        const direction = asCurrentDirection(value);
        ctx.scene.setParams({ currentDirection: direction });
        ctx.setControlValue(key, direction);
        return true;
      }
      if (key === 'autoRun') {
        const autoRun = Number(value) > 0;
        ctx.scene.setParams({ autoRun });
        ctx.setControlValue(key, autoRun);
        return true;
      }
      if (
        key === 'inclineAngle' ||
        key === 'magneticField' ||
        key === 'current' ||
        key === 'mass'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({ [key]: number } as Partial<AmpereBalanceParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
