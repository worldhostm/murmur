import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, PrimaryButton, Screen, SecondaryButton } from '../components';
import { useTheme } from '../theme';

export interface OnboardingScreenProps {
  onStart: () => void;
  onText?: () => void;
}

export function OnboardingScreen({ onStart, onText }: OnboardingScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { space } = useTheme();
  return (
    <Screen fill testID="screen-onboarding">
      <View style={{ flex: 1, justifyContent: 'center', gap: space[6] }}>
        <AppText variant="displayLg" color="ink">
          {t('onboarding.headline')}
        </AppText>
        <AppText variant="body" color="inkMuted">
          {t('onboarding.body')}
        </AppText>
      </View>
      <View style={{ gap: space[3] }}>
        <AppText variant="caption" color="inkMuted" style={{ textAlign: 'center' }}>
          {t('onboarding.privacyNote')}
        </AppText>
        {onText && (
          <SecondaryButton
            testID="onboarding-text"
            label={t('device.continueText')}
            onPress={onText}
          />
        )}
        <PrimaryButton label={t('onboarding.start')} onPress={onStart} testID="onboarding-start" />
      </View>
    </Screen>
  );
}
