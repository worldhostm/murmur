import type { UploadCheckAdapters } from './adapters/types';
import { MAX_FILE_BYTES, MIN_IMAGE_EDGE, type CheckResult, type UploadContext } from './types';

/**
 * 실사·일러스트 이미지(정면 1장) 검수.
 * 실존 인물이면 본인 인증이 있어야 하고(없으면 hold), 유명인 유사도가 높으면 반려한다 (딥페이크 차단).
 */
export async function checkImage(
  bytes: Uint8Array,
  ctx: UploadContext,
  adapters: Pick<UploadCheckAdapters, 'faceDetector' | 'realPersonClassifier' | 'contentSafety'>,
): Promise<CheckResult> {
  const rejected: string[] = [];
  const hold: string[] = [];
  const metadata: Record<string, unknown> = { fileBytes: bytes.byteLength, visibility: 'private' };

  if (bytes.byteLength > MAX_FILE_BYTES) rejected.push('file-too-large');

  const face = await adapters.faceDetector.detect(bytes);
  Object.assign(metadata, {
    faces: face.faces,
    width: face.width,
    height: face.height,
    frontal: face.frontal,
  });
  if (face.faces !== 1) rejected.push(face.faces === 0 ? 'no-face' : 'multiple-faces');
  if (Math.min(face.width, face.height) < MIN_IMAGE_EDGE) rejected.push('resolution-too-low');
  if (!face.frontal) rejected.push('not-frontal');

  const safety = await adapters.contentSafety.check(bytes);
  if (!safety.safe) {
    rejected.push('unsafe-content');
    metadata.safetyLabels = safety.labels;
  }

  const person = await adapters.realPersonClassifier.classify(bytes);
  Object.assign(metadata, { realPerson: person.realPerson, celebrityMatch: person.celebrityMatch });
  if (person.realPerson && person.celebrityMatch) rejected.push('celebrity');
  else if (person.realPerson && !ctx.identityVerified) hold.push('identity-verification-required');

  if (rejected.length > 0) return { verdict: 'rejected', reasons: rejected, metadata };
  if (hold.length > 0) return { verdict: 'hold', reasons: hold, metadata };
  return { verdict: 'approved', reasons: [], metadata };
}
