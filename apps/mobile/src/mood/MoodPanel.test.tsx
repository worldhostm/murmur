import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithTheme } from '../test/render';
import { MoodPanel } from './MoodPanel';
import { MoodStore } from './MoodStore';

it('saves, browses dates, confirms deletion, and retains a draft on storage failure', async () => {
  let value: string | null = null;
  let fail = false;
  const store = new MoodStore({
    read: async () => value,
    write: async (v) => {
      if (fail) throw new Error('disk');
      value = v;
    },
  });
  await store.save('yesterday', new Date(2026, 0, 1));
  renderWithTheme(<MoodPanel store={store} />);
  await waitFor(() => expect(screen.getByText('2026-01-01')).toBeTruthy());
  fireEvent.press(screen.getByText('2026-01-01'));
  expect(screen.getByText('yesterday')).toBeTruthy();
  fireEvent.changeText(screen.getByTestId('mood-input'), 'today');
  fireEvent.press(screen.getByTestId('mood-save'));
  await waitFor(() => expect(screen.getByText('저장했어요')).toBeTruthy());
  expect(screen.getByTestId('mood-input').props.value).toBe('');
  fail = true;
  fireEvent.changeText(screen.getByTestId('mood-input'), 'keep draft');
  fireEvent.press(screen.getByTestId('mood-save'));
  await waitFor(() =>
    expect(
      screen.getByText('기록을 불러오거나 저장하지 못했어요. 입력한 내용은 유지돼요.'),
    ).toBeTruthy(),
  );
  expect(screen.getByTestId('mood-input').props.value).toBe('keep draft');
  fail = false;
  const alert = jest.spyOn(Alert, 'alert');
  fireEvent.press(screen.getByText('모든 기록 삭제'));
  expect(await store.list()).toHaveLength(2);
  const action = alert.mock.calls[0]![2]![1]!;
  await act(async () => {
    action.onPress?.();
  });
  expect(await store.list()).toEqual([]);
  alert.mockRestore();
});
