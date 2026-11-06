/**
 * 생성된 언어별 파일을 소비 프로젝트로 복사한다. `pnpm sync:generated`
 *  - C#     → apps/avatar-unity/Assets/Murmur/Generated/
 *  - Kotlin → apps/mobile/android/app/src/main/java/app/murmur/faceprotocol/
 *  - Swift  → apps/mobile/ios/Murmur/Generated/
 * 복사본은 커밋한다(네이티브 빌드가 저장소만으로 돌아야 하므로). 원본을 고치면 generate → sync 순서로 다시 돌린다.
 */
import { copyFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FILES: [string, string][] = [
  ['packages/design-tokens/dist/Tokens.cs', 'apps/avatar-unity/Assets/Murmur/Generated/Tokens.cs'],
  ['packages/face-protocol/dist/generated/FaceProtocol.cs', 'apps/avatar-unity/Assets/Murmur/Generated/FaceProtocol.cs'],
  ['packages/face-protocol/dist/generated/FaceProtocol.kt', 'apps/mobile/android/app/src/main/java/app/murmur/faceprotocol/FaceProtocol.kt'],
  ['packages/face-protocol/dist/generated/FaceProtocol.swift', 'apps/mobile/ios/Murmur/Generated/FaceProtocol.swift'],
];

const check = process.argv.includes('--check');
let stale = 0;
for (const [src, dst] of FILES) {
  const from = join(ROOT, src);
  const to = join(ROOT, dst);
  if (check) {
    if (!existsSync(to) || readFileSync(to, 'utf8') !== readFileSync(from, 'utf8')) {
      console.error(`stale: ${dst} (run pnpm sync:generated)`);
      stale++;
    }
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`synced ${src} → ${dst}`);
}
if (check) {
  if (stale > 0) process.exit(1);
  console.log('synced copies up to date');
}
