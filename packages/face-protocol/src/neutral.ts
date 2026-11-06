import type { FaceFrame } from './types';
import { BLEND_SHAPE_COUNT, PROTOCOL_VERSION } from './types';

/** 무표정 프레임: 계수 전부 0, 회전 없음, 카메라 앞 0.5m. */
export function neutralFrame(timestampMs = 0): FaceFrame {
  return {
    version: PROTOCOL_VERSION,
    timestampMs,
    tracking: 'tracked',
    blendShapes: new Float32Array(BLEND_SHAPE_COUNT),
    headPose: {
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: -0.5 },
    },
  };
}
