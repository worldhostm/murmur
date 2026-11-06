import React from 'react';
import { requireNativeComponent, UIManager, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { AppText } from '../components';
import { useTheme } from '../theme';

const NATIVE_NAME = 'MurmurUnityView';

/** 네이티브 Unity 뷰가 등록되어 있는지 (unityLibrary 가 포함된 빌드인지). */
export function isUnityViewAvailable(): boolean {
  try {
    return UIManager.getViewManagerConfig(NATIVE_NAME) != null;
  } catch {
    return false;
  }
}

const NativeUnityView = isUnityViewAvailable() ? requireNativeComponent<ViewProps>(NATIVE_NAME) : null;

export interface UnityViewProps extends ViewProps {
  /** Unity 가 없는 빌드에서 자리 표시 문구를 보일지. 기본 true (개발용). */
  showPlaceholder?: boolean;
}

/**
 * 통화 화면의 아바타 렌더 영역. Unity as a Library 가 포함된 빌드에서는 UnityPlayer 를 그리고,
 * 아니면 lavender 면에 안내만 둔다. 프레임 전달은 UnityAvatarRenderer 어댑터가 맡는다.
 */
export function UnityView({ showPlaceholder = true, style, ...rest }: UnityViewProps): React.JSX.Element {
  const { color } = useTheme();
  if (NativeUnityView) return <NativeUnityView testID="unity-view-native" style={[{ flex: 1 }, style]} {...rest} />;
  return (
    <View testID="unity-view-placeholder" style={[{ flex: 1, backgroundColor: color.lavender, alignItems: 'center', justifyContent: 'center' }, style]} {...rest}>
      {showPlaceholder && (
        <AppText variant="caption" color="ink">
          Unity renderer not bundled
        </AppText>
      )}
    </View>
  );
}
