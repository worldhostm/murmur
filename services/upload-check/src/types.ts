import { BLEND_SHAPE_NAMES } from '@murmur/face-protocol';

export type UploadKind = 'vrm' | 'gltf' | 'image';

export type Verdict = 'approved' | 'rejected' | 'hold';

export interface CheckResult {
  verdict: Verdict;
  /** 기계가 읽는 사유 코드. 사용자 문구는 앱의 i18n 키로 바꾼다. */
  reasons: string[];
  metadata: Record<string, unknown>;
}

/** 검수 상한 (PLANNING.md "유저 업로드"). 값을 바꾸면 docs/specs/upload-check.md 도 같이 고친다. */
export const MAX_TRIANGLES = 70_000;
export const MAX_TEXTURE_BYTES = 32 * 1024 * 1024;
export const MAX_FILE_BYTES = 64 * 1024 * 1024;
export const MIN_IMAGE_EDGE = 1024;
/** 이 개수 이상 있으면 자동 보정(리타깃)으로 보류, 미만이면 반려. */
export const MIN_BLEND_SHAPES_FOR_RETARGET = 40;

/** 필요한 표정 블렌드셰이프. face-protocol 의 52개와 같다. */
export const REQUIRED_BLEND_SHAPES: readonly string[] = BLEND_SHAPE_NAMES;

export interface UploadContext {
  uploaderId: string;
  /** 본인 사진 업로드 시 본인 인증을 통과했는지. */
  identityVerified: boolean;
  /** VRM 메타의 author 와 대조할, 업로더가 주장하는 제작자 이름. */
  authorClaim?: string;
}
