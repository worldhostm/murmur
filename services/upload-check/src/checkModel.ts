import type { UploadCheckAdapters } from './adapters/types';
import {
  MAX_FILE_BYTES,
  MAX_TEXTURE_BYTES,
  MAX_TRIANGLES,
  MIN_BLEND_SHAPES_FOR_RETARGET,
  REQUIRED_BLEND_SHAPES,
  type CheckResult,
  type UploadContext,
} from './types';

/**
 * 3D 캐릭터(VRM 우선, glTF/GLB 허용) 검수.
 * 반려 사유가 하나라도 있으면 rejected, 아니면 보류 사유가 있으면 hold, 아니면 approved.
 */
export async function checkModel(
  bytes: Uint8Array,
  ctx: UploadContext,
  adapters: Pick<UploadCheckAdapters, 'modelInspector' | 'contentSafety'>,
): Promise<CheckResult> {
  const rejected: string[] = [];
  const hold: string[] = [];
  const metadata: Record<string, unknown> = { fileBytes: bytes.byteLength, visibility: 'private' };

  if (bytes.byteLength > MAX_FILE_BYTES) rejected.push('file-too-large');

  const info = await adapters.modelInspector.inspect(bytes);
  Object.assign(metadata, {
    format: info.format,
    triangles: info.triangles,
    textureBytes: info.textureBytes,
  });
  if (info.triangles > MAX_TRIANGLES) rejected.push('too-many-triangles');
  if (info.textureBytes > MAX_TEXTURE_BYTES) rejected.push('textures-too-large');

  const present = new Set(info.blendShapeNames);
  const missing = REQUIRED_BLEND_SHAPES.filter((n) => !present.has(n));
  metadata.missingBlendShapes = missing;
  if (missing.length > 0) {
    const presentCount = REQUIRED_BLEND_SHAPES.length - missing.length;
    if (presentCount >= MIN_BLEND_SHAPES_FOR_RETARGET) hold.push('auto-retarget-needed');
    else rejected.push('blend-shapes-missing');
  }

  if (info.license) {
    metadata.license = info.license;
    const authorMatches =
      info.license.author === undefined || ctx.authorClaim === undefined
        ? false
        : info.license.author === ctx.authorClaim;
    if (info.license.allowedUser === 'author' && !authorMatches) hold.push('license-review');
  }

  const safety = await adapters.contentSafety.check(bytes);
  if (!safety.safe) {
    rejected.push('unsafe-content');
    metadata.safetyLabels = safety.labels;
  }

  if (rejected.length > 0) return { verdict: 'rejected', reasons: rejected, metadata };
  if (hold.length > 0) return { verdict: 'hold', reasons: hold, metadata };
  return { verdict: 'approved', reasons: [], metadata };
}
