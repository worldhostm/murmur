#!/bin/sh
# Unity 라이선스 없이 apps/avatar-unity 의 C# 을 컴파일만 검사한다.
# Unity Hub 에 설치된 에디터의 Roslyn(csc)과 참조 어셈블리를 쓴다. `pnpm unity:compile-check`
# UnityEngine.dll/UnityEditor.dll 파사드는 모듈 DLL과 충돌하므로 모듈만 참조한다.
# 패키지(URP, UniVRM) 타입은 참조하지 않으므로 Murmur.Runtime/Editor/Tests 가 엔진 API 만 쓰는지 확인하는 용도다.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(sed -n 's/^m_EditorVersion: //p' "$ROOT/apps/avatar-unity/ProjectSettings/ProjectVersion.txt")"
U="/Applications/Unity/Hub/Editor/$VERSION/Unity.app/Contents"
if [ ! -d "$U" ]; then
  echo "Unity $VERSION 이 설치되어 있지 않다 ($U). 건너뜀."
  exit 0
fi
OUT="${TMPDIR:-/tmp}/murmur-unity-compile"
mkdir -p "$OUT"
set -- \
  -r:"$U/NetStandard/ref/2.1.0/netstandard.dll" \
  -r:"$U/NetStandard/compat/2.1.0/shims/netfx/mscorlib.dll" \
  -r:"$U/Managed/UnityEngine/UnityEngine.CoreModule.dll" \
  -r:"$U/Managed/UnityEngine/UnityEngine.AnimationModule.dll" \
  -r:"$U/Managed/UnityEngine/UnityEditor.CoreModule.dll" \
  -r:"$U/Resources/PackageManager/BuiltInPackages/com.unity.ext.nunit/net40/unity-custom/nunit.framework.dll"
# Editor 스크립트는 URP API 를 쓴다. 에디터가 한 번이라도 프로젝트를 열었으면 Library/ScriptAssemblies 에 패키지 DLL 이 있다.
SA="$ROOT/apps/avatar-unity/Library/ScriptAssemblies"
if [ -f "$SA/Unity.RenderPipelines.Universal.Runtime.dll" ]; then
  set -- "$@" -r:"$SA/Unity.RenderPipelines.Core.Runtime.dll" -r:"$SA/Unity.RenderPipelines.Universal.Runtime.dll"
  FILES="$(find "$ROOT/apps/avatar-unity/Assets/Murmur" -name '*.cs')"
else
  echo "Library/ScriptAssemblies 에 URP DLL 이 없어 Editor/ 스크립트는 건너뛴다 (Unity 에디터로 프로젝트를 한 번 열면 포함된다)."
  FILES="$(find "$ROOT/apps/avatar-unity/Assets/Murmur" -name '*.cs' -not -path '*/Editor/*')"
fi
# shellcheck disable=SC2086
"$U/Tools/netcorerun/netcorerun" "$U/DotNetSdkRoslyn/csc.dll" -nologo -target:library -langversion:9.0 -nostdlib \
  -define:UNITY_EDITOR -define:UNITY_INCLUDE_TESTS -warn:3 -out:"$OUT/Murmur.dll" "$@" $FILES
# 플레이어(Android) 빌드와 같은 조건으로 한 번 더: UNITY_EDITOR 없이, Editor/Tests 제외, AndroidJNI 모듈 참조.
# `#if UNITY_ANDROID && !UNITY_EDITOR` 안의 코드는 위 패스에서 빠지므로 여기서 잡는다.
PLAYER_FILES="$(find "$ROOT/apps/avatar-unity/Assets/Murmur" -name '*.cs' -not -path '*/Editor/*' -not -path '*/Tests/*')"
# shellcheck disable=SC2086
"$U/Tools/netcorerun/netcorerun" "$U/DotNetSdkRoslyn/csc.dll" -nologo -target:library -langversion:9.0 -nostdlib \
  -define:UNITY_ANDROID -warn:3 -out:"$OUT/Murmur.Android.dll" \
  -r:"$U/NetStandard/ref/2.1.0/netstandard.dll" \
  -r:"$U/NetStandard/compat/2.1.0/shims/netfx/mscorlib.dll" \
  -r:"$U/Managed/UnityEngine/UnityEngine.CoreModule.dll" \
  -r:"$U/Managed/UnityEngine/UnityEngine.AnimationModule.dll" \
  -r:"$U/Managed/UnityEngine/UnityEngine.AndroidJNIModule.dll" \
  $PLAYER_FILES
echo "Unity C# compile OK → $OUT/Murmur.dll, $OUT/Murmur.Android.dll"
