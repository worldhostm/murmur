export class FaceProtocolError extends Error {
  override name = 'FaceProtocolError';
}

export class InvalidFrameError extends FaceProtocolError {
  override name = 'InvalidFrameError';
}

export class UnsupportedVersionError extends FaceProtocolError {
  override name = 'UnsupportedVersionError';
  constructor(
    public readonly version: number,
    public readonly supported: readonly number[],
  ) {
    super(`unsupported face-protocol version ${version} (supported: ${supported.join(', ')})`);
  }
}
