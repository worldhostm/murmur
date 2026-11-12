import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inspectFont, auditFonts } from './check-fonts.mjs';

function font(weight = 600, name = 'NotoSansKR-SemiBold') {
  const label = Buffer.from(name, 'utf16le').swap16();
  const names = Buffer.alloc(18 + label.length);
  names.writeUInt16BE(1, 2);
  names.writeUInt16BE(18, 4);
  names.writeUInt16BE(3, 6);
  names.writeUInt16BE(6, 12);
  names.writeUInt16BE(label.length, 14);
  label.copy(names, 18);
  const data = Buffer.alloc(50 + names.length);
  data.writeUInt32BE(0x10000);
  data.writeUInt16BE(2, 4);
  data.write('OS/2', 12);
  data.writeUInt32BE(44, 20);
  data.writeUInt32BE(6, 24);
  data.write('name', 28);
  data.writeUInt32BE(50, 36);
  data.writeUInt32BE(names.length, 40);
  data.writeUInt16BE(weight, 48);
  names.copy(data, 50);
  return data;
}

test('reads actual weight/name metadata and rejects non-font or truncated input', () => {
  assert.deepEqual(inspectFont(font()), {
    weight: '600',
    postScriptNames: ['NotoSansKR-SemiBold'],
  });
  assert.throws(() => inspectFont(Buffer.from('<html>failed download</html>')));
  assert.throws(() => inspectFont(font().subarray(0, 55)));
});

test('distinguishes fallback, missing assets, valid registration, and stale/wrong native assets', () => {
  const root = mkdtempSync(join(tmpdir(), 'murmur-fonts-'));
  const put = (path, data) => {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, data);
  };
  const assetRoot = 'apps/mobile/assets/fonts/';
  const manifest = {
    enabled: false,
    fonts: [
      { file: 'NotoSansKR-SemiBold.ttf', weight: '600', postScriptName: 'NotoSansKR-SemiBold' },
    ],
    licenses: ['OFL.txt'],
  };
  try {
    put(assetRoot + 'manifest.json', JSON.stringify(manifest));
    assert.equal(auditFonts(root).fallback, true);
    assert.deepEqual(auditFonts(root).errors, []);
    assert.ok(auditFonts(root, true).errors.some((v) => v.includes('Missing asset')));
    manifest.enabled = true;
    put(assetRoot + 'manifest.json', JSON.stringify(manifest));
    put(assetRoot + 'NotoSansKR-SemiBold.ttf', font());
    put(assetRoot + 'OFL.txt', 'SIL OPEN FONT LICENSE Version 1.1');
    put('apps/mobile/android/app/src/main/assets/fonts/NotoSansKR-SemiBold.ttf', font());
    put(
      'apps/mobile/ios/Murmur/Info.plist',
      '<key>UIAppFonts</key><array><string>NotoSansKR-SemiBold.ttf</string></array>',
    );
    put(
      'apps/mobile/ios/Murmur.xcodeproj/project.pbxproj',
      '/* Begin PBXResourcesBuildPhase section */ NotoSansKR-SemiBold.ttf in Resources /* End PBXResourcesBuildPhase section */',
    );
    assert.deepEqual(auditFonts(root).errors, []);
    put(assetRoot + 'NotoSansKR-SemiBold.ttf', font(400, 'OtherFace'));
    const errors = auditFonts(root).errors;
    assert.ok(errors.some((v) => v.includes('Wrong weight')));
    assert.ok(errors.some((v) => v.includes('Wrong PostScript')));
    assert.ok(errors.some((v) => v.includes('Android font missing or stale')));
    put('apps/mobile/ios/Murmur/Info.plist', '<dict />');
    assert.ok(auditFonts(root).errors.some((v) => v.includes('UIAppFonts missing')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
