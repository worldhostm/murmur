import type { UploadCheckAdapters } from './adapters/types';
import { checkImage } from './checkImage';
import { checkModel } from './checkModel';
import type { CheckResult, UploadContext, UploadKind } from './types';

export * from './types';
export * from './adapters/types';
export * from './adapters/fake';
export { checkModel } from './checkModel';
export { checkImage } from './checkImage';

/**
 * 업로드 검수 진입점. 결과의 visibility 는 항상 'private' 다.
 * 공개 공유는 별도 동의와 권리 확인을 거친 뒤 다른 절차로 바꾼다.
 */
export async function checkUpload(
  kind: UploadKind,
  bytes: Uint8Array,
  ctx: UploadContext,
  adapters: UploadCheckAdapters,
): Promise<CheckResult> {
  const result =
    kind === 'image'
      ? await checkImage(bytes, ctx, adapters)
      : await checkModel(bytes, ctx, adapters);
  return { ...result, metadata: { ...result.metadata, kind, visibility: 'private' } };
}
