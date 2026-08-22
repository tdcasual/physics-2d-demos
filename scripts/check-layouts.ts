import { registerAllLayouts } from '../src/app/layouts/auto-register';
import { satisfiesConstraints } from '../src/app/layouts/layout-constraints';
import { layoutRegistry } from '../src/app/layouts/registry';

registerAllLayouts();

const errors: string[] = [];
for (const metadata of layoutRegistry.getAllMetadata()) {
  const profile = metadata.layoutTestProfile;
  if (!profile) {
    errors.push(
      `${metadata.id}: registered layout is missing layoutTestProfile`
    );
    continue;
  }
  if (!metadata.supportedSlots.includes('control')) {
    errors.push(`${metadata.id}: missing required control slot`);
  }
  if (!metadata.supportedSlots.includes('animation')) {
    errors.push(`${metadata.id}: missing required animation slot`);
  }
  if (profile.viewports.length === 0) {
    errors.push(`${metadata.id}: layoutTestProfile must define a viewport`);
  }
  for (const viewport of profile.viewports) {
    const orientation =
      viewport.width >= viewport.height ? 'landscape' : 'portrait';
    if (!satisfiesConstraints(metadata, viewport, orientation)) {
      errors.push(
        `${metadata.id}: test viewport ${viewport.width}x${viewport.height} does not satisfy layout constraints`
      );
    }
  }
}

if (errors.length > 0) {
  console.error('Layout contract check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Layout contract check passed (${layoutRegistry.getAllMetadata().length} layouts).`
);
