import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppNavigator } from './AppNavigator';

describe('AppNavigator', () => {
  it('walks onboarding → character select → solo → random match', () => {
    render(<AppNavigator />);
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
