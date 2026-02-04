import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { requestLocation } from '../services/location';
import { colors, spacing } from '../styles/theme';

export function ShortlistScreen() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const [items, setItems] = useState<{ matches: any[]; partials: any[] }>({ matches: [], partials: [] });

  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      const location = await requestLocation();
      const query = location ? `?lat=${location.latitude}&lng=${location.longitude}` : '';
      const response = await apiFetch(`/sessions/${sessionId}/shortlist${query}`);
      if (!response.ok) return;
      const data = await response.json();
      setItems(data);
    })();
  }, [sessionId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unanimous matches</Text>
      <FlatList
        data={items.matches}
        keyExtractor={(item) => item.place.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.place.name}</Text>
            <Text style={styles.cardMeta}>{item.place.rating ?? '—'} ★ · {item.yesCount} YES</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No matches yet</Text>}
      />

      <Text style={styles.title}>Partial matches</Text>
      <FlatList
        data={items.partials}
        keyExtractor={(item) => item.place.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.place.name}</Text>
            <Text style={styles.cardMeta}>{item.place.rating ?? '—'} ★ · {item.yesCount} YES</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No partials yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontWeight: '600',
    color: colors.secondary,
  },
  cardMeta: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.muted,
    marginBottom: spacing.lg,
  },
});
