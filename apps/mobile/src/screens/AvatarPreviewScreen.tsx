import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Screen, TextButton } from '../components';
import { useTheme } from '../theme';

export function AvatarPreviewScreen({
  renderer,
  status,
  onBack,
  onText,
}: {
  renderer: React.ReactNode;
  status?: string | undefined;
  onBack: () => void;
  onText: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { color, radius, space } = useTheme();
  return (
    <Screen
      fill
      testID="screen-avatar-preview"
      title={t('lobby.preview')}
      onBack={onBack}
      footer={<TextButton label={t('device.continueText')} onPress={onText} />}
    >
      <AppText variant="bodySm" color="inkMuted">
        {t('design.previewBody')}
      </AppText>
      <View
        style={{
          flex: 1,
          minHeight: space[12] * 2,
          backgroundColor: color.night,
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        {renderer}
      </View>
      <View
        style={{ borderRadius: radius.md, padding: space[4], backgroundColor: color.surface200 }}
      >
        <AppText variant="bodySm" accessibilityLiveRegion="polite">
          {status ?? t('design.previewPreparing')}
        </AppText>
      </View>
    </Screen>
  );
}
