/** 생성된 C# 파일을 Unity 프로젝트로 복사한다. `pnpm sync:unity` */
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DEST = join(ROOT, 'apps/avatar-unity/Assets/Murmur/Generated');
const FILES: [string, string][] = [
  ['packages/design-tokens/dist/Tokens.cs', 'Tokens.cs'],
  ['packages/face-protocol/dist/generated/FaceProtocol.cs', 'FaceProtocol.cs'],
];

mkdirSync(DEST, { recursive: true });
for (const [src, name] of FILES) {
  copyFileSync(join(ROOT, src), join(DEST, name));
  console.log(`synced ${src} → apps/avatar-unity/Assets/Murmur/Generated/${name}`);
}
