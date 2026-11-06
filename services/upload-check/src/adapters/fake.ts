import { BLEND_SHAPE_NAMES } from '@murmur/face-protocol';
import type {
  ContentSafetyAdapter,
  ContentSafetyVerdict,
  FaceDetection,
  FaceDetector,
  ModelInspection,
  ModelInspector,
  RealPersonClassifier,
  RealPersonVerdict,
  UploadCheckAdapters,
} from './types';

export class FakeModelInspector implements ModelInspector {
  constructor(private readonly result: Partial<ModelInspection> = {}) {}
  async inspect(): Promise<ModelInspection> {
    return {
      format: 'vrm',
      triangles: 20_000,
      textureBytes: 8 * 1024 * 1024,
      blendShapeNames: [...BLEND_SHAPE_NAMES],
      ...this.result,
    };
  }
}

export class FakeFaceDetector implements FaceDetector {
  constructor(private readonly result: Partial<FaceDetection> = {}) {}
  async detect(): Promise<FaceDetection> {
    return { faces: 1, width: 2048, height: 2048, frontal: true, ...this.result };
  }
}

export class FakeRealPersonClassifier implements RealPersonClassifier {
  constructor(private readonly result: Partial<RealPersonVerdict> = {}) {}
  async classify(): Promise<RealPersonVerdict> {
    return { realPerson: false, celebrityMatch: false, confidence: 0.9, ...this.result };
  }
}

export class FakeContentSafety implements ContentSafetyAdapter {
  constructor(private readonly result: Partial<ContentSafetyVerdict> = {}) {}
  async check(): Promise<ContentSafetyVerdict> {
    return { safe: true, labels: [], ...this.result };
  }
}

/** 전부 통과하는 기본 가짜 어댑터 묶음. 테스트에서 일부만 바꿔 쓴다. */
export function fakeAdapters(overrides: Partial<UploadCheckAdapters> = {}): UploadCheckAdapters {
  return {
    modelInspector: new FakeModelInspector(),
    faceDetector: new FakeFaceDetector(),
    realPersonClassifier: new FakeRealPersonClassifier(),
    contentSafety: new FakeContentSafety(),
    ...overrides,
  };
}
