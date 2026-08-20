import { registerAllLayouts } from '../src/app/layouts/auto-register';
import { layoutRegistry } from '../src/app/layouts/registry';

registerAllLayouts();

const errors: string[] = [];
for (const metadata of layoutRegistry.getAllMetadata()) {
  if (!metadata.autoSelectable) continue;

  const profile = metadata.layoutTestProfile;
  if (!profile) {
    errors.push(
      `${metadata.id}: auto-selectable layout is missing layoutTestProfile`
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
}

if (errors.length > 0) {
  console.error('Layout contract check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Layout contract check passed (${layoutRegistry.getAllMetadata().length} layouts).`
);
