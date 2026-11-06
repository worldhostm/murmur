/**
 * 모듈 경계 검사 (docs/PLANNING.md "개발 방법론 1").
 *
 * 규칙
 *  - apps/*     는 packages/* 만 가져다 쓴다. services/* 나 다른 apps/* 를 import 하면 실패.
 *  - services/* 는 packages/* 만 가져다 쓴다. 다른 services/* 나 apps/* 를 import 하면 실패.
 *  - packages/* 는 다른 packages/* 만 가져다 쓴다. apps/*, services/* 를 import 하면 실패.
 *  - 어떤 모듈도 상대 경로로 워크스페이스 밖(../../다른패키지)을 가리키지 않는다.
 *
 * 워크스페이스 패키지 이름은 @murmur/<name> 규칙을 따른다.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const GROUPS = ['apps', 'packages', 'services'] as const;
type Group = (typeof GROUPS)[number];

const ALLOWED: Record<Group, Group[]> = {
  apps: ['packages'],
  services: ['packages'],
  packages: ['packages'],
};

interface Workspace {
  name: string;
  group: Group;
  dir: string;
}

function listWorkspaces(): Workspace[] {
  const out: Workspace[] = [];
  for (const group of GROUPS) {
    const groupDir = join(ROOT, group);
    if (!existsSync(groupDir)) continue;
    for (const entry of readdirSync(groupDir)) {
      const dir = join(groupDir, entry);
      const pkgJson = join(dir, 'package.json');
      if (!existsSync(pkgJson)) continue;
      const name = JSON.parse(readFileSync(pkgJson, 'utf8')).name as string;
      out.push({ name, group, dir });
    }
  }
  return out;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', 'build', 'ios', 'android', 'coverage'].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const IMPORT_RE = /(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g;

function main(): void {
  const workspaces = listWorkspaces();
  const byName = new Map(workspaces.map((w) => [w.name, w]));
  const violations: string[] = [];

  for (const ws of workspaces) {
    for (const file of walk(ws.dir)) {
      const src = readFileSync(file, 'utf8');
      for (const match of src.matchAll(IMPORT_RE)) {
        const spec = match[1]!;
        const rel = relative(ROOT, file);

        if (spec.startsWith('@murmur/')) {
          const target = byName.get(spec.split('/').slice(0, 2).join('/'));
          if (!target) continue;
          if (target.dir === ws.dir) continue;
          if (!ALLOWED[ws.group].includes(target.group)) {
            violations.push(`${rel}: ${ws.group}/${ws.name} → ${target.group}/${target.name} (${spec}) 금지`);
          }
          continue;
        }

        if (spec.startsWith('.')) {
          const abs = resolve(dirname(file), spec);
          if (!abs.startsWith(ws.dir + '/') && abs !== ws.dir) {
            violations.push(`${rel}: 워크스페이스 밖 상대 경로 import (${spec}) 금지`);
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('모듈 경계 위반:\n' + violations.map((v) => '  - ' + v).join('\n'));
    process.exit(1);
  }
  console.log(`모듈 경계 OK (${workspaces.length} workspaces)`);
}

main();
