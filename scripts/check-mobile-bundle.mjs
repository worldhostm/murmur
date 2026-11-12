import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadConfig } from 'metro-config';
import Metro from 'metro';

// Validate the real RN entry without a listening server or filesystem watchers.
const root = resolve(import.meta.dirname, '..');
const config = await loadConfig({
  config: resolve(root, 'apps/mobile/metro.config.js'),
  maxWorkers: 2,
});
config.resolver.useWatchman = false;
const output = resolve(tmpdir(), 'murmur-bundle-check');
mkdirSync(output, { recursive: true });
await Metro.runBuild(config, {
  entry: resolve(root, 'apps/mobile/index.js'),
  platform: 'android',
  dev: false,
  minify: true,
  out: resolve(output, 'index.android'),
});
console.log(`Android JavaScript bundle verified: ${output}/index.android.js`);
