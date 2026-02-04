import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SwipeCard } from './SwipeCard';
import { colors, spacing } from '../styles/theme';

interface SwipeDeckProps {
  items: any[];
  onSwipe: (item: any, decision: 'YES' | 'NO') => void;
  photoProxyBase: string;
}

export function SwipeDeck({ items, onSwipe, photoProxyBase }: SwipeDeckProps) {
  const top = items[0];
  const second = items[1];

  if (!top) {
    return <View style={styles.empty} />;
  }

  return (
    <View style={styles.container}>
      {second ? (
        <View style={styles.behindCard} pointerEvents="none">
          <SwipeCard item={{ ...second, photoProxyBase }} onSwipe={() => {}} />
        </View>
      ) : null}
      <SwipeCard
        item={{ ...top, photoProxyBase }}
        onSwipe={(decision) => onSwipe(top, decision)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  behindCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
