import React from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { AiCharacterBadge } from './AiCharacterBadge';
import { useTheme } from '../theme';

export type ChatBubbleProps =
  | { side: 'me'; text: string }
  | { side: 'other'; text: string; isAi?: false; name?: string }
  | { side: 'other'; text: string; isAi: true; name: string };

/**
 * 말풍선 (DESIGN_SYSTEM.md §7).
 * 내 것: brand/on-brand. 상대: surface-300 + border. AI: 상대와 같되 위에 이름(accent caption)과 "AI 캐릭터" 표시.
 */
export function ChatBubble(props: ChatBubbleProps): React.JSX.Element {
  const { color, space, radius } = useTheme();
  const mine = props.side === 'me';
  const isAi = props.side === 'other' && props.isAi === true;

  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: space[2] }}>
      {isAi && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[1] }}>
          <AppText variant="caption" color="accent">
            {props.name}
          </AppText>
          <AiCharacterBadge />
        </View>
      )}
      {!isAi && props.side === 'other' && props.name && (
        <AppText variant="caption" color="inkMuted" style={{ marginBottom: space[1] }}>
          {props.name}
        </AppText>
      )}
      <View
        style={{
          maxWidth: '80%',
          padding: space[3],
          borderRadius: radius.md,
          backgroundColor: mine ? color.brand : color.surface300,
          borderWidth: mine ? 0 : 1,
          borderColor: color.border,
        }}
      >
        <AppText variant="body" color={mine ? 'onBrand' : 'ink'}>
          {props.text}
        </AppText>
      </View>
    </View>
  );
}
