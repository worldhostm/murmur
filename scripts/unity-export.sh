#!/bin/sh
# Unity as a Library 내보내기. `pnpm unity:export:android` / `pnpm unity:export:ios` / `pnpm unity:export:ios-simulator`
# 출력: apps/avatar-unity/Builds/<platform>/ (gitignore). Android 는 unityLibrary gradle 모듈, iOS 는 Xcode 프로젝트.
set -eu
PLATFORM="${1:-android}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(sed -n 's/^m_EditorVersion: //p' "$ROOT/apps/avatar-unity/ProjectSettings/ProjectVersion.txt")"
UNITY="/Applications/Unity/Hub/Editor/$VERSION/Unity.app/Contents/MacOS/Unity"
[ -x "$UNITY" ] || { echo "Unity $VERSION 이 없다."; exit 1; }
case "$PLATFORM" in
  android) METHOD=Murmur.Editor.BuildLibrary.Android; TARGET=Android ;;
  ios) METHOD=Murmur.Editor.BuildLibrary.iOS; TARGET=iOS ;;
  ios-simulator) METHOD=Murmur.Editor.BuildLibrary.iOSSimulator; TARGET=iOS ;;
  *) echo "platform: android | ios | ios-simulator"; exit 2 ;;
esac
LOG="${TMPDIR:-/tmp}/murmur-unity-export-$PLATFORM.log"
"$UNITY" -batchmode -nographics -quit -projectPath "$ROOT/apps/avatar-unity" -buildTarget "$TARGET" -executeMethod "$METHOD" -logFile "$LOG" || {
  echo "내보내기 실패. 로그: $LOG"; grep -E "error|Error|BuildLibrary" "$LOG" | grep -v Licensing | tail -20; exit 1; }
grep -E "\[BuildLibrary\]" "$LOG" | tail -1
ls "$ROOT/apps/avatar-unity/Builds/$PLATFORM"
