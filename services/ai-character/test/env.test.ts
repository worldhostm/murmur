import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDotEnv } from '../src/env';

describe('loadDotEnv', () => {
  it('fills missing keys only, strips quotes and comments, ignores a missing file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'murmur-env-'));
    const file = join(dir, '.env');
    writeFileSync(file, '# comment\nOPENAI_API_KEY="sk-abc"\nPORT=9000\nBROKEN\n');
    const env: NodeJS.ProcessEnv = { PORT: '1' };
    loadDotEnv(file, env);
    expect(env).toEqual({ PORT: '1', OPENAI_API_KEY: 'sk-abc' });
    loadDotEnv(join(dir, 'nope.env'), env);
    expect(env.OPENAI_API_KEY).toBe('sk-abc');
  });
});
