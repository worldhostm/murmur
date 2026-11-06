import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppNavigator } from './AppNavigator';

const supported = { supported: true, reason: 'ok' as const, details: {} };

describe('AppNavigator', () => {
  it('shows the unsupported-device screen and nothing else when the device fails the gate', () => {
    render(<AppNavigator deviceSupportOverride={{ supported: false, reason: 'launched-before-2020', details: {} }} />);
    expect(screen.getByTestId('screen-unsupported-device')).toBeTruthy();
    expect(screen.getByTestId('unsupported-reason').props.children).toBe('2020년 이전에 출시된 기기예요');
    expect(screen.queryByTestId('screen-onboarding')).toBeNull();
  });

  it('resolves support from native when no override is given (dev build without module → open)', async () => {
    render(<AppNavigator />);
    await waitFor(() => expect(screen.getByTestId('screen-onboarding')).toBeTruthy());
  });

  it('walks onboarding → character select → solo → random match', () => {
    render(<AppNavigator deviceSupportOverride={supported} />);
    expect(screen.getByTestId('screen-onboarding')).toBeTruthy();
    fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(screen.getByTestId('screen-character-select')).toBeTruthy();
    fireEvent.press(screen.getByTestId('character-card-han-seorin'));
    fireEvent.press(screen.getByTestId('character-select-confirm'));
    expect(screen.getByTestId('screen-solo')).toBeTruthy();
    fireEvent.press(screen.getByTestId('solo-call-friend'));
    expect(screen.getByTestId('screen-call')).toBeTruthy();
  });
});
