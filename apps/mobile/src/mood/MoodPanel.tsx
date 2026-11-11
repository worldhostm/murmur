import React, { useEffect, useRef, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, MoodCard, SecondaryButton } from '../components';
import { useTheme } from '../theme';
import { localDate, type MoodStore, type MoodEntry } from './MoodStore';

export function MoodPanel({ store }: { store: MoodStore }): React.JSX.Element {
  const { t } = useTranslation();
  const { color, space, text } = useTheme();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [date, setDate] = useState(localDate(new Date()));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(true);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    store
      .list()
      .then((v) => {
        if (alive.current) setEntries(v);
      })
      .catch(() => {
        if (alive.current) setStatus('mood.error');
      })
      .finally(() => {
        if (alive.current) setBusy(false);
      });
    return () => {
      alive.current = false;
    };
  }, [store]);
  const change = async (operation: () => Promise<MoodEntry[]>, saved = false) => {
    if (lock.current || busy) return;
    lock.current = true;
    setBusy(true);
    try {
      const next = await operation();
      if (!alive.current) return;
      setEntries(next);
      setStatus(saved ? 'mood.saved' : 'mood.deleted');
      if (saved) {
        setDraft('');
        setDate(localDate(new Date()));
      }
    } catch {
      if (alive.current) setStatus('mood.error');
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const confirm = (operation: () => Promise<MoodEntry[]>) =>
    Alert.alert(t('mood.deleteTitle'), t('mood.deleteBody'), [
      { text: t('mood.cancel'), style: 'cancel' },
      {
        text: t('mood.delete'),
        style: 'destructive',
        onPress: () => {
          void change(operation);
        },
      },
    ]);
  const inputStyle = [text.body, { color: color.ink, paddingVertical: space[2] }];
  return (
    <MoodCard title={t('solo.moodTitle')}>
      <AppText variant="caption" color="inkMuted">
        {t('mood.privacy')}
      </AppText>
      <TextInput
        testID="mood-input"
        accessibilityLabel={t('solo.moodTitle')}
        value={draft}
        onChangeText={setDraft}
        maxLength={500}
        editable={!busy}
        placeholder={t('solo.moodPlaceholder')}
        placeholderTextColor={color.inkMuted}
        style={inputStyle}
      />
      <SecondaryButton
        testID="mood-save"
        label={t('solo.moodSave')}
        disabled={busy || !draft.trim()}
        onPress={() => {
          void change(() => store.save(draft), true);
        }}
      />
      {!!status && (
        <AppText testID="mood-status" accessibilityLiveRegion="polite">
          {t(status)}
        </AppText>
      )}
      <AppText variant="heading">{t('mood.history')}</AppText>
      <TextInput
        testID="mood-date"
        accessibilityLabel={t('mood.date')}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        maxLength={10}
        style={inputStyle}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {[...new Set(entries.map((entry) => entry.date))]
          .sort()
          .reverse()
          .map((day) => (
            <SecondaryButton key={day} label={day} onPress={() => setDate(day)} />
          ))}
      </View>
      {entries
        .filter((entry) => entry.date === date)
        .map((entry) => (
          <View key={entry.id} style={{ gap: space[2] }}>
            <AppText>{entry.text}</AppText>
            <SecondaryButton
              label={t('mood.delete')}
              disabled={busy}
              onPress={() => confirm(() => store.remove(entry.id))}
            />
          </View>
        ))}
      {!entries.some((entry) => entry.date === date) && (
        <AppText color="inkMuted">{t('mood.empty')}</AppText>
      )}
      <SecondaryButton
        label={t('mood.deleteAll')}
        disabled={busy}
        onPress={() => confirm(() => store.clear())}
      />
    </MoodCard>
  );
}
