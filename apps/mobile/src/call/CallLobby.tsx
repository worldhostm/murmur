import React, { useEffect, useRef, useState } from 'react';
import { Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ClientMessage, ServerEvent } from '@murmur/shared-types';
import {
  AppText,
  LabeledInput,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TextButton,
} from '../components';
import { useTheme } from '../theme';
import type { ConnectSignaling, SignalingConnection } from './SignalingClient';

export function CallLobby({
  connect,
  onBack,
  onText,
  onPreview,
}: {
  connect?: ConnectSignaling | undefined;
  onBack: () => void;
  onText: () => void;
  onPreview?: (() => void) | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { space } = useTheme();
  const connection = useRef<SignalingConnection>();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(connect ? 'lobby.connecting' : 'lobby.unavailable');
  const [code, setCode] = useState('');
  const [intent, setIntent] = useState<'invite' | 'join'>('invite');
  const [shareError, setShareError] = useState(false);
  const [invite, setInvite] = useState('');
  const [mode, setMode] = useState<'friend' | 'random' | null>(null);
  const [peer, setPeer] = useState<{ id: string; session: string }>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!connect) return;
    let alive = true;
    const onEvent = (event: ServerEvent) => {
      if (!alive) return;
      switch (event.type) {
        case 'room-created':
          setInvite(event.code);
          setStatus('lobby.waitingFriend');
          break;
        case 'peer-joined':
        case 'matched':
          setPeer({ id: event.peerId, session: event.sessionId });
          setStatus('lobby.peerPresent');
          break;
        case 'peer-left':
          setPeer(undefined);
          setStatus('lobby.peerLeft');
          break;
        case 'reported':
          setStatus('lobby.reported');
          break;
        case 'error':
          setStatus(event.code === 'age-restricted' ? 'lobby.ageRequired' : 'lobby.requestError');
          setMode(null);
          break;
      }
    };
    connect(onEvent, () => {
      if (alive) {
        setReady(false);
        setStatus('lobby.error');
      }
    })
      .then((conn) => {
        if (!alive) {
          conn.close();
          return;
        }
        connection.current = conn;
        setReady(true);
        setStatus('lobby.ready');
      })
      .catch(() => {
        if (alive) setStatus('lobby.error');
      });
    return () => {
      alive = false;
      connection.current?.close();
      connection.current = undefined;
    };
  }, [connect]);
  const send = async (message: ClientMessage, nextMode?: 'friend' | 'random') => {
    if (lock.current || !connection.current || !ready) return;
    lock.current = true;
    setBusy(true);
    if (nextMode) setMode(nextMode);
    try {
      await connection.current.send(message);
    } catch {
      setStatus('lobby.error');
      setReady(false);
      connection.current.close();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen testID="screen-call-lobby" title={t('lobby.title')} onBack={onBack} keyboardAvoiding>
      <AppText variant="bodySm" color="inkMuted">
        {t('lobby.mediaPending')}
      </AppText>
      {onPreview && <SecondaryButton label={t('lobby.preview')} onPress={onPreview} />}
      <AppText testID="lobby-status" accessibilityLiveRegion="polite">
        {t(status)}
      </AppText>
      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          <TextButton
            label={t('lobby.inviteTab')}
            accessibilityState={{ selected: intent === 'invite' }}
            disabled={mode !== null}
            onPress={() => setIntent('invite')}
          />
          <TextButton
            testID="lobby-join-tab"
            label={t('lobby.joinTab')}
            accessibilityState={{ selected: intent === 'join' }}
            disabled={mode !== null}
            onPress={() => setIntent('join')}
          />
        </View>
        {intent === 'invite' && !invite && (
          <PrimaryButton
            testID="lobby-create"
            label={t('lobby.create')}
            disabled={!ready || busy || mode !== null}
            onPress={() => {
              void send({ type: 'create-room', maxParticipants: 2 }, 'friend');
            }}
          />
        )}
        {!!invite && (
          <View style={{ gap: space[2] }}>
            <AppText variant="bodySm">{t('lobby.code')}</AppText>
            <AppText variant="title" testID="lobby-invite" selectable>
              {invite}
            </AppText>
            <PrimaryButton
              label={t('lobby.share')}
              onPress={() => {
                setShareError(false);
                void Share.share({ message: t('lobby.shareMessage', { code: invite }) }).catch(() =>
                  setShareError(true),
                );
              }}
            />
            {shareError && (
              <AppText variant="bodySm" accessibilityLiveRegion="polite">
                {t('lobby.shareError')}
              </AppText>
            )}
          </View>
        )}
        {intent === 'join' && (
          <>
            <LabeledInput
              testID="lobby-code"
              label={t('lobby.code')}
              value={code}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={(v) => setCode(v.toUpperCase().trim())}
              placeholder="ABC234"
            />
            <PrimaryButton
              testID="lobby-join"
              label={t('lobby.join')}
              disabled={!ready || busy || mode !== null || !/^[A-HJ-NP-Z2-9]{6}$/.test(code)}
              onPress={() => {
                void send({ type: 'join-room', code }, 'friend');
              }}
            />
          </>
        )}
        <AppText variant="heading">{t('lobby.otherOptions')}</AppText>
        <AppText variant="bodySm" color="inkMuted">
          {t('lobby.ageRequired')}
        </AppText>
        <SecondaryButton
          testID="lobby-random"
          label={t('lobby.random')}
          disabled={!ready || busy || mode !== null}
          onPress={() => {
            void send({ type: 'join-random', ageGate: 'unverified' }, 'random');
          }}
        />
        {mode && (
          <SecondaryButton
            label={t('lobby.cancel')}
            disabled={busy}
            onPress={() => {
              void send({ type: 'leave' }).then(() => {
                setMode(null);
                setInvite('');
                setPeer(undefined);
              });
            }}
          />
        )}
        {peer && (
          <>
            <TextButton
              destructive
              label={t('lobby.report')}
              disabled={!ready || busy}
              onPress={() => {
                void send({
                  type: 'report',
                  targetId: peer.id,
                  sessionId: peer.session,
                  reason: 'other',
                });
              }}
            />
            <TextButton
              destructive
              label={t('lobby.block')}
              disabled={!ready || busy}
              onPress={() => {
                void send({ type: 'block', targetId: peer.id }).then(onBack);
              }}
            />
          </>
        )}
        <SecondaryButton testID="lobby-text" label={t('device.continueText')} onPress={onText} />
      </View>
    </Screen>
  );
}
