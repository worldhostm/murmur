#!/bin/sh
# Unity as a Library (iOS): 내보낸 Xcode 프로젝트에서 UnityFramework 를 Device·Simulator 로 빌드해 xcframework 로 합친다.
# `pnpm unity:framework:ios`  (먼저 pnpm unity:export:ios [+ unity:export:ios-simulator])
# 출력: apps/avatar-unity/Builds/ios/UnityFramework.xcframework + MurmurUnity.podspec (둘 다 gitignore).
# 앱의 Podfile 은 podspec 이 있으면 자동으로 pod 'MurmurUnity' 를 포함한다.
# Unity 는 Data 폴더를 앱 타깃 리소스로 두므로, UaaL 에서는 프레임워크 안에 Data 를 복사하고
# 런타임에 setDataBundleId("com.unity3d.framework") 를 불러야 한다.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILDS="$ROOT/apps/avatar-unity/Builds"
OUT="$BUILDS/ios/UnityFramework.xcframework"
TMP="${TMPDIR:-/tmp}/murmur-unity-ios-framework"
rm -rf "$TMP"; mkdir -p "$TMP"

build_slice() { # <folder> <sdk> <destination>
  local dir="$BUILDS/$1" sdk="$2" dest="$3" dd="$TMP/$1"
  [ -d "$dir/Unity-iPhone.xcodeproj" ] || { echo "skip $1: 내보내기 없음 ($dir)"; return 1; }
  echo "== building UnityFramework ($1, $sdk)"
  xcodebuild -project "$dir/Unity-iPhone.xcodeproj" -scheme UnityFramework -configuration Release \
    -sdk "$sdk" -destination "$dest" -derivedDataPath "$dd" \
    CODE_SIGNING_ALLOWED=NO SKIP_INSTALL=NO BUILD_LIBRARY_FOR_DISTRIBUTION=NO build > "$TMP/$1.log" 2>&1 \
    || { echo "FAILED $1 (log: $TMP/$1.log)"; grep -E "error:" "$TMP/$1.log" | sort -u | head -10; return 1; }
  local fw; fw="$(find "$dd/Build/Products" -name UnityFramework.framework -maxdepth 2 | head -1)"
  [ -n "$fw" ] || { echo "FAILED $1: UnityFramework.framework 없음"; return 1; }
  if [ ! -d "$fw/Data" ]; then cp -R "$dir/Data" "$fw/Data"; echo "   Data → $fw/Data"; fi
  echo "$fw"
}

DEVICE="$(build_slice ios iphoneos 'generic/platform=iOS' | tail -1)" || DEVICE=""
SIM="$(build_slice ios-simulator iphonesimulator 'generic/platform=iOS Simulator' | tail -1)" || SIM=""
case "$DEVICE" in /*) ;; *) echo "Device 슬라이스 실패"; exit 1 ;; esac

rm -rf "$OUT"
case "$SIM" in
  /*) xcodebuild -create-xcframework -framework "$DEVICE" -framework "$SIM" -output "$OUT" ;;
  *) echo "Simulator 슬라이스 없음 → Device 전용 xcframework 로 만든다"; xcodebuild -create-xcframework -framework "$DEVICE" -output "$OUT" ;;
esac

cat > "$BUILDS/ios/MurmurUnity.podspec" <<'POD'
Pod::Spec.new do |s|
  s.name         = 'MurmurUnity'
  s.version      = '0.1.0'
  s.summary      = 'Unity as a Library renderer for Murmur (generated, not committed)'
  s.homepage     = 'https://github.com/murmur'
  s.license      = { :type => 'Proprietary', :text => 'Internal' }
  s.author       = 'Murmur'
  s.source       = { :path => '.' }
  s.platform     = :ios, '15.0'
  s.vendored_frameworks = 'UnityFramework.xcframework'
  # Unity 의 시뮬레이터 라이브러리(baselib.a 등)는 x86_64 뿐이다. Apple Silicon 에서는 시뮬레이터 빌드를 x86_64(Rosetta)로 돌린다.
  s.pod_target_xcconfig  = { 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64' }
  s.user_target_xcconfig = { 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64' }
end
POD
echo "xcframework: $OUT"; ls "$OUT"
