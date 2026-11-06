import { describe, expect, it } from 'vitest';
import {
  FakeContentSafety,
  FakeFaceDetector,
  FakeRealPersonClassifier,
  fakeAdapters,
} from '../src/adapters/fake';
import { checkImage } from '../src/checkImage';
import { checkUpload } from '../src/index';
import { MIN_IMAGE_EDGE } from '../src/types';

const bytes = new Uint8Array(1024);
const unverified = { uploaderId: 'u1', identityVerified: false };
const verified = { uploaderId: 'u1', identityVerified: true };

describe('checkImage', () => {
  it('approves a frontal illustration', async () => {
    const r = await checkImage(bytes, unverified, fakeAdapters());
    expect(r.verdict).toBe('approved');
  });

  it('rejects 0 or 2 faces, low resolution, non-frontal', async () => {
    expect(
      (
        await checkImage(
          bytes,
          verified,
          fakeAdapters({ faceDetector: new FakeFaceDetector({ faces: 0 }) }),
        )
      ).reasons,
    ).toEqual(['no-face']);
    expect(
      (
        await checkImage(
          bytes,
          verified,
          fakeAdapters({ faceDetector: new FakeFaceDetector({ faces: 2 }) }),
        )
      ).reasons,
    ).toEqual(['multiple-faces']);
    expect(
      (
        await checkImage(
          bytes,
          verified,
          fakeAdapters({ faceDetector: new FakeFaceDetector({ width: MIN_IMAGE_EDGE - 1 }) }),
        )
      ).reasons,
    ).toEqual(['resolution-too-low']);
    expect(
      (
        await checkImage(
          bytes,
          verified,
          fakeAdapters({ faceDetector: new FakeFaceDetector({ frontal: false }) }),
        )
      ).reasons,
    ).toEqual(['not-frontal']);
  });

  it('rejects unsafe content', async () => {
    const r = await checkImage(
      bytes,
      verified,
      fakeAdapters({ contentSafety: new FakeContentSafety({ safe: false, labels: ['nudity'] }) }),
    );
    expect(r).toMatchObject({ verdict: 'rejected', reasons: ['unsafe-content'] });
  });

  it('real person: celebrity → rejected; unverified → hold; verified → approved', async () => {
    const celeb = await checkImage(
      bytes,
      verified,
      fakeAdapters({
        realPersonClassifier: new FakeRealPersonClassifier({
          realPerson: true,
          celebrityMatch: true,
        }),
      }),
    );
    expect(celeb).toMatchObject({ verdict: 'rejected', reasons: ['celebrity'] });
    const real = new FakeRealPersonClassifier({ realPerson: true });
    const held = await checkImage(bytes, unverified, fakeAdapters({ realPersonClassifier: real }));
    expect(held).toMatchObject({ verdict: 'hold', reasons: ['identity-verification-required'] });
    const ok = await checkImage(bytes, verified, fakeAdapters({ realPersonClassifier: real }));
    expect(ok.verdict).toBe('approved');
  });

  it('checkUpload dispatches and forces private visibility', async () => {
    const img = await checkUpload('image', bytes, verified, fakeAdapters());
    expect(img.metadata).toMatchObject({ kind: 'image', visibility: 'private' });
    const vrm = await checkUpload('vrm', bytes, verified, fakeAdapters());
    expect(vrm.metadata).toMatchObject({ kind: 'vrm', visibility: 'private', format: 'vrm' });
    const gltf = await checkUpload('gltf', bytes, verified, fakeAdapters());
    expect(gltf.verdict).toBe('approved');
  });
});
