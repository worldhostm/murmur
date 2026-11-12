import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';

/** Static brand motif. No animation or decorative emoji; safe with reduced motion. */
export function RippleMark(): React.JSX.Element {
  const { space, radius, color } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: space[12],
        height: space[12],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {[space[12], space[8], space[4]].map((diameter) => (
        <View
          key={diameter}
          style={{
            position: 'absolute',
            width: diameter,
            height: diameter,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: color.brand,
          }}
        />
      ))}
    </View>
  );
}
