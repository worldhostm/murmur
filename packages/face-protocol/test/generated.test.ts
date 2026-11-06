import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkGenerated, loadSchema, render } from '../scripts/generate';

const GEN = join(import.meta.dirname, '..', 'dist', 'generated');

describe('generated files', () => {
  it('dist/generated is up to date with schema (run pnpm generate if this fails)', () => {
    expect(checkGenerated()).toEqual([]);
  });

  it('every generated file carries the DO NOT EDIT header', () => {
    for (const name of ['blendShapes.ts', 'FaceProtocol.cs', 'FaceProtocol.swift', 'FaceProtocol.kt']) {
      const head = readFileSync(join(GEN, name), 'utf8').split('\n')[0];
      expect(head).toContain('GENERATED FROM schema/face-frame.schema.json');
      expect(head).toContain('DO NOT EDIT');
    }
  });

  it('all languages list the 52 names in schema order', () => {
    const schema = loadSchema();
    const out = render(schema);
    const names = schema.blendShapeNames;
    const pascal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const tsMatches = [...out['blendShapes.ts']!.matchAll(/^ {2}'([a-zA-Z]+)',$/gm)].map((m) => m[1]);
    expect(tsMatches).toEqual(names);

    const csEnum = [...out['FaceProtocol.cs']!.matchAll(/^ {8}([A-Za-z]+) = (\d+),$/gm)]
      .filter((m) => Number(m[2]) < 52 && names.includes(m[1]!.charAt(0).toLowerCase() + m[1]!.slice(1)))
      .map((m) => m[1]);
    expect(csEnum).toEqual(names.map(pascal));
    expect(out['FaceProtocol.cs']).toContain('FrameByteLength = 144');

    const swiftCases = [...out['FaceProtocol.swift']!.matchAll(/^ {4}case ([a-zA-Z]+) = (\d+)$/gm)]
      .filter((m) => names.includes(m[1]!))
      .map((m) => m[1]);
    expect(swiftCases).toEqual(names);

    const ktEntries = [...out['FaceProtocol.kt']!.matchAll(/^ {4}([A-Za-z]+)\("([a-zA-Z]+)"\),$/gm)].map(
      (m) => m[2],
    );
    expect(ktEntries).toEqual(names);
    expect(out['FaceProtocol.kt']).toContain('MEDIAPIPE_INDEX_OFFSET: Int = 1');
  });
});
