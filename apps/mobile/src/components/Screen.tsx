import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { useTheme } from '../theme';
import { BackButton } from './BackButton';

export interface ScreenProps {
  children: React.ReactNode;
  /** 통화 화면처럼 스크롤 없이 꽉 채우는 경우. */
  fill?: boolean;
  testID?: string;
  /** 있으면 왼쪽 상단에 뒤로가기를 둔다. */
  onBack?: (() => void) | undefined;
}

/** 화면 바탕: surface-100, 좌우 space-4, 상단 space-8 (뒤로가기가 있으면 space-4). */
export function Screen({ children, fill = false, testID, onBack }: ScreenProps): React.JSX.Element {
  const { color, space } = useTheme();
  const inner = {
    paddingHorizontal: space[4],
    paddingTop: onBack ? space[4] : space[8],
    paddingBottom: space[6],
    gap: space[6],
  };
  const back = onBack ? <BackButton onPress={onBack} /> : null;
  return (
    <SafeAreaView testID={testID} style={{ flex: 1, backgroundColor: color.surface100 }}>
      {fill ? (
        <View style={[inner, { flex: 1 }]}>
          {back}
          {children}
        </View>
      ) : (
        <ScrollView contentContainerStyle={inner}>
          {back}
          {children}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
