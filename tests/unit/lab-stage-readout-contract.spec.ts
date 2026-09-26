import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { LabStageLayout } from '../../src/app/layouts/layouts/lab-stage/lab-stage';
import {
  LAB_DATA_SLOT_ATTR,
  READOUT_SLOT_ATTR
} from '../../src/platform/stage-chrome';

/**
 * Fix 2 契约：lab-stage 声明 inline 读数能力，数据插槽属性提升为
 * platform 常量，读数插槽位于数据插槽之前（场景数据面板 append 后
 * 视觉位序为「读数在上、数据表在下」）。
 */
describe('lab-stage readout & data slot contract (Fix 2)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1280px';
    container.style.height = '800px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('declares the inline readout-panel capability', () => {
    const layout = new LabStageLayout(container, {});
    const declaration = layout.capabilities.find(
      (c) => c.id === 'readout-panel'
    );
    expect(declaration).toBeTruthy();
    const config = declaration?.config as { position?: string };
    expect(config?.position).toBe('inline');
  });

  it('mounts the lab data slot under the platform attribute with the readout slot before it', async () => {
    const layout = new LabStageLayout(container, {
      floatData: true,
      floatGraph: false
    });
    await layout.mount();

    const dataSlot = container.querySelector(`[${LAB_DATA_SLOT_ATTR}]`);
    const readoutSlot = container.querySelector(`[${READOUT_SLOT_ATTR}]`);
    expect(dataSlot).toBeTruthy();
    expect(readoutSlot).toBeTruthy();
    // 读数插槽在数据插槽之前
    expect(
      readoutSlot!.compareDocumentPosition(dataSlot!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    await layout.unmount();
  });
});
