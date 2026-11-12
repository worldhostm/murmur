import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Minimal static TrueType metadata inspection. No font parsing dependency or network needed. */
export function inspectFont(buffer) {
  if (buffer.length < 12 || buffer.readUInt32BE(0) !== 0x00010000)
    throw new Error('Static TrueType file required');
  const count = buffer.readUInt16BE(4);
  if (12 + count * 16 > buffer.length) throw new Error('Invalid font table directory');
  const tables = new Map();
  for (let i = 0; i < count; i++) {
    const pos = 12 + i * 16;
    const tag = buffer.toString('ascii', pos, pos + 4);
    const offset = buffer.readUInt32BE(pos + 8);
    const length = buffer.readUInt32BE(pos + 12);
    if (offset + length > buffer.length) throw new Error('Truncated font table');
    tables.set(tag, buffer.subarray(offset, offset + length));
  }
  if (tables.has('fvar')) throw new Error('Variable font not supported by this static mapping');
  const os2 = tables.get('OS/2');
  const names = tables.get('name');
  if (!os2 || os2.length < 6 || !names || names.length < 6)
    throw new Error('Missing font metadata');
  const entries = names.readUInt16BE(2);
  const strings = names.readUInt16BE(4);
  if (6 + entries * 12 > names.length) throw new Error('Truncated names');
  const postScriptNames = [];
  for (let i = 0; i < entries; i++) {
    const pos = 6 + i * 12;
    const platform = names.readUInt16BE(pos);
    if (names.readUInt16BE(pos + 6) !== 6 || (platform !== 0 && platform !== 3)) continue;
    const length = names.readUInt16BE(pos + 8);
    const offset = strings + names.readUInt16BE(pos + 10);
    if (length % 2 || offset + length > names.length) throw new Error('Invalid font name');
    const encoded = Buffer.from(names.subarray(offset, offset + length));
    postScriptNames.push(encoded.swap16().toString('utf16le'));
  }
  return { weight: String(os2.readUInt16BE(4)), postScriptNames };
}

export function auditFonts(root, strict = false) {
  const assets = resolve(root, 'apps/mobile/assets/fonts');
  const manifest = JSON.parse(readFileSync(resolve(assets, 'manifest.json'), 'utf8'));
  if (!manifest.enabled && !strict) return { errors: [], fallback: true, bytes: 0 };
  const errors = [];
  if (strict && !manifest.enabled) errors.push('Noto is disabled in manifest.json');
  const plistPath = resolve(root, 'apps/mobile/ios/Murmur/Info.plist');
  const projectPath = resolve(root, 'apps/mobile/ios/Murmur.xcodeproj/project.pbxproj');
  const plist = existsSync(plistPath) ? readFileSync(plistPath, 'utf8') : '';
  const project = existsSync(projectPath) ? readFileSync(projectPath, 'utf8') : '';
  const registered = plist.match(/<key>UIAppFonts<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1] ?? '';
  let bytes = 0;
  for (const font of manifest.fonts) {
    const source = resolve(assets, font.file);
    if (!existsSync(source)) {
      errors.push(`Missing asset: ${font.file}`);
      continue;
    }
    const data = readFileSync(source);
    bytes += data.length;
    try {
      const info = inspectFont(data);
      if (info.weight !== font.weight) errors.push(`Wrong weight: ${font.file}`);
      if (!info.postScriptNames.includes(font.postScriptName))
        errors.push(`Wrong PostScript name: ${font.file}`);
    } catch (error) {
      errors.push(`${font.file}: ${error.message}`);
    }
    const android = resolve(root, 'apps/mobile/android/app/src/main/assets/fonts', font.file);
    if (!existsSync(android) || !data.equals(readFileSync(android)))
      errors.push(`Android font missing or stale: ${font.file}`);
    if (!registered.includes(`<string>${font.file}</string>`))
      errors.push(`iOS UIAppFonts missing: ${font.file}`);
    const resources =
      project.match(
        /\/\* Begin PBXResourcesBuildPhase section \*\/([\s\S]*?)\/\* End PBXResourcesBuildPhase section \*\//,
      )?.[1] ?? '';
    if (!resources.includes(`${font.file} in Resources`))
      errors.push(`iOS resource missing: ${font.file}`);
  }
  for (const file of manifest.licenses) {
    const path = resolve(assets, file);
    if (!existsSync(path) || !readFileSync(path, 'utf8').includes('SIL OPEN FONT LICENSE'))
      errors.push(`Missing OFL license: ${file}`);
  }
  return { errors, fallback: !manifest.enabled, bytes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = auditFonts(root, process.argv.includes('--require-bundled'));
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      result.fallback
        ? 'Fonts: explicit system fallback (Noto not enabled).'
        : 'Fonts: asset metadata and native registration checks passed. Device rendering still needs verification.',
    );
    console.log(`Font source size: ${result.bytes} bytes`);
  }
}
