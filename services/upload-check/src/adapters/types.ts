/**
 * 외부 검수 엔진 어댑터 (ADR 0004). 실제 모델 파서·얼굴 검출·분류기는 전부 이 뒤에 둔다.
 */

export interface VrmLicense {
  /** VRM 메타의 이용 허락 범위. */
  allowedUser: 'author' | 'explicit' | 'everyone';
  commercialUse: boolean;
  author?: string;
}

export interface ModelInspection {
  format: 'vrm' | 'gltf';
  triangles: number;
  textureBytes: number;
  blendShapeNames: string[];
  license?: VrmLicense;
}

export interface ModelInspector {
  inspect(bytes: Uint8Array): Promise<ModelInspection>;
}

export interface FaceDetection {
  faces: number;
  width: number;
  height: number;
  frontal: boolean;
}

export interface FaceDetector {
  detect(bytes: Uint8Array): Promise<FaceDetection>;
}

export interface RealPersonVerdict {
  realPerson: boolean;
  celebrityMatch: boolean;
  confidence: number;
}

export interface RealPersonClassifier {
  classify(bytes: Uint8Array): Promise<RealPersonVerdict>;
}

export interface ContentSafetyVerdict {
  safe: boolean;
  labels: string[];
}

export interface ContentSafetyAdapter {
  check(bytes: Uint8Array): Promise<ContentSafetyVerdict>;
}

export interface UploadCheckAdapters {
  modelInspector: ModelInspector;
  faceDetector: FaceDetector;
  realPersonClassifier: RealPersonClassifier;
  contentSafety: ContentSafetyAdapter;
}
