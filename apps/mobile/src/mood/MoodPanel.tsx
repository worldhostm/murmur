import React, { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AppText,
  LabeledInput,
  PrimaryButton,
  TextButton,
  SegmentedControl,
  RippleMark,
} from '../components';
import { useTheme } from '../theme';
import { localDate, type MoodStore, type MoodEntry } from './MoodStore';

export function MoodPanel({ store }: { store: MoodStore }): React.JSX.Element {
  const { t } = useTranslation();
  const { space, color, radius } = useTheme();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [date, setDate] = useState(localDate(new Date()));
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState<'write' | 'history'>('write');
  const [visibleCount, setVisibleCount] = useState(20);
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
  const selected = entries.filter((entry) => entry.date === date);
  const dates = [...new Set(entries.map((entry) => entry.date))].sort().reverse().slice(0, 7);
  const selectDate = (value: string) => {
    setDate(value);
    setVisibleCount(20);
  };
  return (
    <View style={{ gap: space[4] }}>
      <View
        style={{
          backgroundColor: color.cream,
          padding: space[6],
          borderRadius: radius.lg,
          gap: space[2],
        }}
      >
        <AppText variant="caption" color="inkMuted">
          {localDate(new Date())}
        </AppText>
        <AppText variant="characterName">{t('design.journalTitle')}</AppText>
        <AppText variant="bodySm" color="inkMuted">
          {t('design.journalPrompt')}
        </AppText>
      </View>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'write', label: t('mood.write') },
          { value: 'history', label: t('mood.history') },
        ]}
      />
      {!!status && (
        <AppText testID="mood-status" variant="bodySm" accessibilityLiveRegion="polite">
          {t(status)}
        </AppText>
      )}
      {tab === 'write' ? (
        <>
          <LabeledInput
            label={t('solo.moodTitle')}
            testID="mood-input"
            value={draft}
            onChangeText={setDraft}
            maxLength={500}
            multiline
            editable={!busy}
            placeholder={t('solo.moodPlaceholder')}
            hint={t('mood.characters', { count: draft.length })}
            style={{ minHeight: space[12] * 4, backgroundColor: color.surface300 }}
          />
          <PrimaryButton
            testID="mood-save"
            label={t('solo.moodSave')}
            disabled={busy || !draft.trim()}
            onPress={() => {
              void change(() => store.save(draft), true);
            }}
          />
          <AppText variant="bodySm" color="inkMuted">
            {t('mood.privacy')}
          </AppText>
        </>
      ) : (
        <>
          <LabeledInput
            testID="mood-date"
            label={t('mood.date')}
            value={date}
            onChangeText={selectDate}
            placeholder="YYYY-MM-DD"
            maxLength={10}
            autoCorrect={false}
            hint={t('mood.dateHint')}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {dates.map((day) => (
              <TextButton
                key={day}
                label={day}
                accessibilityState={{ selected: day === date }}
                onPress={() => selectDate(day)}
              />
            ))}
          </View>
          {selected.slice(0, visibleCount).map((entry) => (
            <View
              key={entry.id}
              style={{
                gap: space[2],
                padding: space[4],
                backgroundColor: color.surface300,
                borderRadius: radius.md,
              }}
            >
              <AppText>{entry.text}</AppText>
              <TextButton
                destructive
                label={t('mood.delete')}
                disabled={busy}
                onPress={() => confirm(() => store.remove(entry.id))}
              />
            </View>
          ))}
          {!selected.length && (
            <View style={{ alignItems: 'center', gap: space[3], paddingVertical: space[6] }}>
              <RippleMark />
              <AppText color="inkMuted">{t('mood.empty')}</AppText>
            </View>
          )}
          {selected.length > visibleCount && (
            <TextButton label={t('mood.more')} onPress={() => setVisibleCount((n) => n + 20)} />
          )}
          <TextButton
            destructive
            label={t('mood.deleteAll')}
            disabled={busy}
            onPress={() => confirm(() => store.clear())}
          />
        </>
      )}
    </View>
  );
}
