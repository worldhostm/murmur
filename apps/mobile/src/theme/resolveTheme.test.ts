import { resolveTheme } from './resolveTheme';

describe('resolveTheme (DESIGN_SYSTEM.md §2)', () => {
  it('user preference always wins', () => {
    expect(resolveTheme({ screen: 'solo', userPreference: 'dark', systemScheme: 'light' })).toBe('dark');
    expect(resolveTheme({ screen: 'random-match', userPreference: 'light', systemScheme: 'dark' })).toBe('light');
  });

  it('solo, onboarding, character-select default to light even when the OS is dark', () => {
    for (const screen of ['solo', 'onboarding', 'character-select'] as const) {
      expect(resolveTheme({ screen, userPreference: 'system', systemScheme: 'dark' })).toBe('light');
    }
  });

  it('random-match and room-call default to dark even when the OS is light', () => {
    for (const screen of ['random-match', 'room-call'] as const) {
      expect(resolveTheme({ screen, userPreference: 'system', systemScheme: 'light' })).toBe('dark');
    }
  });

  it('other screens follow the OS scheme', () => {
    expect(resolveTheme({ screen: 'other', userPreference: 'system', systemScheme: 'dark' })).toBe('dark');
    expect(resolveTheme({ screen: 'ai-call', userPreference: 'system', systemScheme: 'light' })).toBe('light');
  });
});
