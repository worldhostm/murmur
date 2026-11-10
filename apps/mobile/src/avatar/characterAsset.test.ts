import { avatarAssetKeyFor, PRIMITIVE_ASSET_KEY } from './characterAsset';

describe('avatarAssetKeyFor', () => {
  it('maps a selected AI character to its front asset key', () => {
    expect(avatarAssetKeyFor('sera')).toBe('characters/sera/front');
    expect(avatarAssetKeyFor('seo-doyoon')).toBe('characters/seo-doyoon/front');
  });

  it('falls back to the primitive mascot when nothing is selected', () => {
    expect(avatarAssetKeyFor(undefined)).toBe(PRIMITIVE_ASSET_KEY);
  });
});
