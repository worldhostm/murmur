import { readFileSync } from 'node:fs';

/**
 * 같은 폴더의 .env 를 읽어 process.env 에 없는 키만 채운다 (의존성 없는 최소 로더).
 * 형식: KEY=value, # 주석, 따옴표는 벗긴다. 이미 있는 환경 변수가 우선한다.
 */
export function loadDotEnv(path: string, env: NodeJS.ProcessEnv = process.env): void {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return; // 없으면 조용히 넘어간다
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (env[key] === undefined) env[key] = value;
  }
}
