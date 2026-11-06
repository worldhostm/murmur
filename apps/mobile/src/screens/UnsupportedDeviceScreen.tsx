import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DeviceSupport } from '../device/deviceSupport';
import { AppText, Screen } from '../components';
import { useTheme } from '../theme';

export interface UnsupportedDeviceScreenProps {
  support: DeviceSupport;
}

/** 지원하지 않는 기기 안내. 재촉하지 않고, 이유와 기준을 차분히 적는다. */
export function UnsupportedDeviceScreen({ support }: UnsupportedDeviceScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { space } = useTheme();
  const reasonKey = `device.reason.${support.reason}`;
  return (
    <Screen fill testID="screen-unsupported-device">
      <View style={{ flex: 1, justifyContent: 'center', gap: space[6] }}>
        <AppText variant="displayMd">{t('device.unsupportedTitle')}</AppText>
        <AppText variant="body" color="inkMuted">
          {t('device.unsupportedBody')}
        </AppText>
        <AppText variant="bodySm" color="inkMuted" testID="unsupported-reason">
          {t(reasonKey)}
        </AppText>
      </View>
      <AppText variant="caption" color="inkMuted">
        {t('device.criteria')}
      </AppText>
    </Screen>
  );
}
