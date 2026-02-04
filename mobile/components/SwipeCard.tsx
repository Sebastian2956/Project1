import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Linking, Platform, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors, spacing } from '../styles/theme';

interface SwipeCardProps {
  item: any;
  onSwipe: (decision: 'YES' | 'NO') => void;
}

const SWIPE_THRESHOLD = 120;
const VERTICAL_THRESHOLD = 80;

export function SwipeCard({ item, onSwipe }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const expanded = useSharedValue(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        const decision = translateX.value > 0 ? 'YES' : 'NO';
        translateX.value = withTiming(translateX.value > 0 ? 500 : -500);
        translateY.value = withTiming(0);
        runOnJS(onSwipe)(decision);
        return;
      }

      if (translateY.value < -VERTICAL_THRESHOLD && !isExpanded) {
        expanded.value = withTiming(1);
        runOnJS(setIsExpanded)(true);
      }
      if (translateY.value > VERTICAL_THRESHOLD && isExpanded) {
        expanded.value = withTiming(0);
        runOnJS(setIsExpanded)(false);
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 20}deg` },
    ],
  }));

  const detailStyle = useAnimatedStyle(() => ({
    height: withTiming(expanded.value ? 260 : 0),
    opacity: expanded.value,
  }));

  const photos = Array.isArray(item.place?.photosJson) ? item.place.photosJson : [];
  const photo = photos[0]?.photo_reference;
  const imageUrl = photo ? `${item.photoProxyBase}/places/photo/${photo}` : null;

  const categories = Array.isArray(item.place?.categoriesJson) ? item.place.categoriesJson : [];

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No photo</Text>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.title}>{item.place.name}</Text>
          <Text style={styles.subtitle}>
            {item.place.rating ?? '—'} ★ · {item.place.priceLevel ?? '—'} ·{' '}
            {categories.slice(0, 2).join(' / ')}
          </Text>
          <Text style={styles.meta}>
            {item.distanceMeters ? `${Math.round(item.distanceMeters)} m` : '—'} ·{' '}
            {item.etaMinutes ? `${item.etaMinutes} min` : '—'}
          </Text>
        </View>
        <Animated.View style={[styles.details, detailStyle]}>
          <Text style={styles.detailHeader}>Details</Text>
          <Text style={styles.detailLine}>{item.place.address ?? 'Address unavailable'}</Text>
          <Text style={styles.detailLine}>{item.place.phone ?? 'Phone unavailable'}</Text>
          {photos.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {photos.slice(0, 5).map((p: any) => (
                <Image
                  key={p.photo_reference}
                  source={{ uri: `${item.photoProxyBase}/places/photo/${p.photo_reference}` }}
                  style={styles.thumb}
                />
              ))}
            </ScrollView>
          ) : null}
          <Pressable
            onPress={() => {
              const query = encodeURIComponent(item.place.address || item.place.name);
              const url = Platform.select({
                ios: `http://maps.apple.com/?q=${query}`,
                android: `https://www.google.com/maps/search/?api=1&query=${query}`,
                default: `https://www.google.com/maps/search/?api=1&query=${query}`,
              });
              if (url) Linking.openURL(url);
            }}
          >
            <Text style={styles.link}>Open in Maps</Text>
          </Pressable>
          {item.place.websiteUrl ? (
            <Pressable onPress={() => Linking.openURL(item.place.websiteUrl)}>
              <Text style={styles.link}>Website</Text>
            </Pressable>
          ) : null}
          {item.place.menuUrl ? (
            <Pressable onPress={() => Linking.openURL(item.place.menuUrl)}>
              <Text style={styles.link}>Menu</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  image: {
    width: '100%',
    height: 260,
  },
  imagePlaceholder: {
    width: '100%',
    height: 260,
    backgroundColor: '#EFE7DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.muted,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.secondary,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  meta: {
    marginTop: spacing.sm,
    color: colors.secondary,
  },
  details: {
    padding: spacing.md,
    overflow: 'hidden',
  },
  detailHeader: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.secondary,
  },
  detailLine: {
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  link: {
    color: colors.primary,
    marginTop: spacing.sm,
  },
  photoRow: {
    marginTop: spacing.sm,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: spacing.sm,
  },
});
