import React from 'react';
import { screen } from '@testing-library/react-native';
import { UnityView, isUnityViewAvailable } from './UnityView';
import { renderWithTheme } from '../test/render';

describe('UnityView', () => {
  it('falls back to a placeholder when the native Unity view is not registered', () => {
    expect(isUnityViewAvailable()).toBe(false);
    renderWithTheme(<UnityView />);
    expect(screen.getByTestId('unity-view-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('unity-view-native')).toBeNull();
  });
});
