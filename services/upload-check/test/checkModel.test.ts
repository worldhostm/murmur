import { describe, expect, it } from 'vitest';
import { BLEND_SHAPE_NAMES } from '@murmur/face-protocol';
import { FakeContentSafety, FakeModelInspector, fakeAdapters } from '../src/adapters/fake';
import { checkModel } from '../src/checkModel';
import { MAX_FILE_BYTES, MAX_TEXTURE_BYTES, MAX_TRIANGLES } from '../src/types';

const ctx = { uploaderId: 'u1', identityVerified: false };
const bytes = new Uint8Array(1024);

describe('checkModel', () => {
  it('approves a compliant VRM', async () => {
    const r = await checkModel(bytes, ctx, fakeAdapters());
    expect(r.verdict).toBe('approved');
    expect(r.metadata.visibility).toBe('private');
  });

  it('rejects oversize file / triangles / textures', async () => {
    const big = await checkModel(new Uint8Array(MAX_FILE_BYTES + 1), ctx, fakeAdapters());
    expect(big.reasons).toContain('file-too-large');
    const tri = await checkModel(
      bytes,
      ctx,
      fakeAdapters({ modelInspector: new FakeModelInspector({ triangles: MAX_TRIANGLES + 1 }) }),
    );
    expect(tri).toMatchObject({ verdict: 'rejected', reasons: ['too-many-triangles'] });
    const tex = await checkModel(
      bytes,
      ctx,
      fakeAdapters({
        modelInspector: new FakeModelInspector({ textureBytes: MAX_TEXTURE_BYTES + 1 }),
      }),
    );
    expect(tex.reasons).toEqual(['textures-too-large']);
  });

  it('holds for auto-retarget when ≥40 blend shapes, rejects when <40', async () => {
    const forty = await checkModel(
      bytes,
      ctx,
      fakeAdapters({
        modelInspector: new FakeModelInspector({ blendShapeNames: BLEND_SHAPE_NAMES.slice(0, 40) }),
      }),
    );
    expect(forty.verdict).toBe('hold');
    expect(forty.reasons).toEqual(['auto-retarget-needed']);
    expect(forty.metadata.missingBlendShapes).toHaveLength(12);
    const few = await checkModel(
      bytes,
      ctx,
      fakeAdapters({
        modelInspector: new FakeModelInspector({ blendShapeNames: BLEND_SHAPE_NAMES.slice(0, 39) }),
      }),
    );
    expect(few).toMatchObject({ verdict: 'rejected', reasons: ['blend-shapes-missing'] });
  });

  it('holds author-only license unless uploader claims matching author', async () => {
    const license = { allowedUser: 'author' as const, commercialUse: false, author: 'alice' };
    const held = await checkModel(
      bytes,
      ctx,
      fakeAdapters({ modelInspector: new FakeModelInspector({ license }) }),
    );
    expect(held).toMatchObject({ verdict: 'hold', reasons: ['license-review'] });
    const ok = await checkModel(
      bytes,
      { ...ctx, authorClaim: 'alice' },
      fakeAdapters({ modelInspector: new FakeModelInspector({ license }) }),
    );
    expect(ok.verdict).toBe('approved');
    const everyone = await checkModel(
      bytes,
      ctx,
      fakeAdapters({
        modelInspector: new FakeModelInspector({
          license: { ...license, allowedUser: 'everyone' },
        }),
      }),
    );
    expect(everyone.verdict).toBe('approved');
  });

  it('rejects unsafe content, and rejection wins over hold', async () => {
    const r = await checkModel(
      bytes,
      ctx,
      fakeAdapters({
        contentSafety: new FakeContentSafety({ safe: false, labels: ['sexual'] }),
        modelInspector: new FakeModelInspector({ blendShapeNames: BLEND_SHAPE_NAMES.slice(0, 45) }),
      }),
    );
    expect(r.verdict).toBe('rejected');
    expect(r.reasons).toEqual(['unsafe-content']);
    expect(r.metadata.safetyLabels).toEqual(['sexual']);
  });
});
