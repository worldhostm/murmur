import { withAlpha } from './color';

describe('withAlpha', () => {
  it('converts hex + alpha to rgba', () => {
    expect(withAlpha('#1A1324', 0.8)).toBe('rgba(26, 19, 36, 0.8)');
  });
  it('clamps alpha', () => {
    expect(withAlpha('#FFFFFF', 2)).toBe('rgba(255, 255, 255, 1)');
  });
  it('rejects short hex', () => {
    expect(() => withAlpha('#FFF', 1)).toThrow();
  });
});
