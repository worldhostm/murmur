import React from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AiCharacterBadge,
  AppText,
  PrimaryButton,
  RippleMark,
  Screen,
  TextButton,
} from '../components';
import { useTheme } from '../theme';
import { characterPortrait, PORTRAIT_ASPECT } from '../avatar/characterImages';

export interface OnboardingScreenProps {
  onStart: () => void;
  onText?: () => void;
}

export function OnboardingScreen({ onStart, onText }: OnboardingScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { space, layout, color, radius } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < layout.compactWidth || fontScale >= layout.largeFontScale;
  return (
    <Screen
      testID="screen-onboarding"
      footer={
        <View style={{ gap: space[1] }}>
          <PrimaryButton
            label={t('onboarding.start')}
            onPress={onStart}
            testID="onboarding-start"
          />
          {onText && (
            <TextButton
              testID="onboarding-text"
              label={t('device.continueText')}
              onPress={onText}
            />
          )}
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title">murmur.</AppText>
        <RippleMark />
      </View>
      <View style={{ gap: space[3] }}>
        <AppText variant="caption" color="brand">
          {t('design.onboardingEyebrow')}
        </AppText>
        <AppText variant={compact ? 'displayCompact' : 'displayLg'}>
          {t('onboarding.headline')}
        </AppText>
        <AppText variant="body" color="inkMuted">
          {t('onboarding.body')}
        </AppText>
      </View>
      <View
        style={{
          flexDirection: compact ? 'column' : 'row',
          backgroundColor: color.cream,
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        <Image
          source={characterPortrait('han-seorin')}
          accessible={false}
          style={{
            width: space[12] * 4 * PORTRAIT_ASPECT,
            height: space[12] * 4,
            alignSelf: compact ? 'center' : undefined,
          }}
        />
        <View style={{ flex: 1, padding: space[4], gap: space[2], justifyContent: 'center' }}>
          <AiCharacterBadge />
          <AppText variant="heading">{t('design.onboardingInvitation')}</AppText>
          <AppText variant="bodySm" color="inkMuted">
            {`${t('character.han-seorin.name')} · ${t('design.radioRoom')}`}
          </AppText>
        </View>
      </View>
      <AppText variant="bodySm" color="inkMuted">
        {t('onboarding.privacyNote')}
      </AppText>
    </Screen>
  );
}
