import { decodeBase64, encodeBase64 } from './base64';

declare const Buffer: { from(b: Uint8Array): { toString(enc: string): string } };

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('base64', () => {
  it('matches Node Buffer for random byte arrays of every length mod 3', () => {
    const rnd = seeded(42);
    for (let len = 0; len < 64; len++) {
      for (let r = 0; r < 3; r++) {
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = Math.floor(rnd() * 256);
        const expected = Buffer.from(bytes).toString('base64');
        expect(encodeBase64(bytes)).toBe(expected);
        expect(Array.from(decodeBase64(expected))).toEqual(Array.from(bytes));
      }
    }
  });

  it('round-trips a 144-byte frame-sized buffer', () => {
    const bytes = new Uint8Array(144).map((_, i) => (i * 37) & 0xff);
    expect(Array.from(decodeBase64(encodeBase64(bytes)))).toEqual(Array.from(bytes));
  });

  it('rejects invalid input', () => {
    expect(() => decodeBase64('abc$')).toThrow();
    expect(() => decodeBase64('a')).toThrow();
  });
});
