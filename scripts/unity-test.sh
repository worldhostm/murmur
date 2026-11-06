#!/bin/sh
# Unity EditMode 테스트를 배치 모드로 돌린다. Unity Hub 로그인(라이선스)이 필요하다. `pnpm unity:test`
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(sed -n 's/^m_EditorVersion: //p' "$ROOT/apps/avatar-unity/ProjectSettings/ProjectVersion.txt")"
UNITY="/Applications/Unity/Hub/Editor/$VERSION/Unity.app/Contents/MacOS/Unity"
if [ ! -x "$UNITY" ]; then echo "Unity $VERSION 이 없다. 건너뜀."; exit 0; fi
OUT="${TMPDIR:-/tmp}/murmur-unity-tests.xml"
LOG="${TMPDIR:-/tmp}/murmur-unity-tests.log"
set +e
"$UNITY" -batchmode -nographics -projectPath "$ROOT/apps/avatar-unity" -runTests -testPlatform EditMode -testResults "$OUT" -logFile "$LOG"
code=$?
set -e
if [ ! -f "$OUT" ]; then
  echo "테스트 결과 파일이 없다 (exit $code). 로그: $LOG"; grep -E "error CS|license" "$LOG" | head -20; exit 1
fi
summary="$(grep -oE 'total="[0-9]+" passed="[0-9]+" failed="[0-9]+"' "$OUT" | head -1)"
echo "Unity EditMode: $summary"
case "$summary" in *'failed="0"'*) exit 0;; *) grep -E '<test-case' "$OUT" | grep -v 'result="Passed"' | grep -oE 'name="[^"]+"' | head; exit 1;; esac
