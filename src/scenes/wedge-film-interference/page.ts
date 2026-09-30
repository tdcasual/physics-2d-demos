import { bootScenePage } from '../../app/scene-bootstrapper';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { WedgeParams } from './scene.sim';
import { wedgeFilmInterferenceControlsSchema } from './controls-schema';
import {
  asWedgeProfile,
  createWedgeFilmInterferenceScene
} from './scene.entry';
import { wedgeFilmInterferenceMeta } from './scene.meta';
const bool = (v: unknown) =>
  v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
bootScenePage({
  meta: wedgeFilmInterferenceMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    leftMinWidth: 280,
    leftMaxWidth: 420,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '干涉读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) =>
    createWedgeFilmInterferenceScene({ canvas, theme, mode, demoHints }),
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: wedgeFilmInterferenceControlsSchema,
      onAction: () => render(),
      onChange: (key, value) => {
        if (key === 'profile') {
          const profile = asWedgeProfile(value);
          if (profile) scene.setParams({ profile });
        } else if (key === 'cursorY')
          scene.setParams({ cursorY: Number(value) / 100 });
        else if (key === 'autoRun') scene.setParams({ autoRun: bool(value) });
        else scene.setParams({ [key]: Number(value) } as Partial<WedgeParams>);
        render();
        writeParam?.(key, value);
      }
    });
    return exposeSchemaHandle(renderer);
  }
});
