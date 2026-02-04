import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Modal, Alert } from 'react-native';
import { useSessionStore } from '../store/sessionStore';
import { requestLocation } from '../services/location';
import { apiFetch, baseUrl } from '../lib/api';
import { SwipeDeck } from '../components/SwipeDeck';
import { connectRealtime } from '../services/realtime';
import { colors, spacing } from '../styles/theme';

export function DeckScreen() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [showEndModal, setShowEndModal] = useState(false);

  useEffect(() => {
    (async () => {
      const location = await requestLocation();
      if (location) {
        setCoords({ lat: location.latitude, lng: location.longitude });
      }
    })();
  }, []);

  useEffect(() => {
    if (!sessionId || !coords) return;

    const socket = connectRealtime(sessionId);
    socket.on('deck:exhausted', () => setShowEndModal(true));
    return () => {
      socket.off('deck:exhausted');
    };
  }, [sessionId, coords]);

  const loadDeck = async () => {
    if (!sessionId || !coords) return;
    const response = await apiFetch(`/sessions/${sessionId}/deck/init`, {
      method: 'POST',
      body: JSON.stringify({ lat: coords.lat, lng: coords.lng, mode: 'ANY' }),
    });
    if (!response.ok) {
      Alert.alert('Failed to load deck');
      return;
    }
    const data = await response.json();
    setItems(data.items);
    setNextCursor(data.nextCursor ?? null);
  };

  const loadNext = async () => {
    if (!sessionId || !coords || nextCursor === null) return;
    const url = `/sessions/${sessionId}/deck?pageCursor=${nextCursor}&group=NEAR&lat=${coords.lat}&lng=${coords.lng}`;
    const response = await apiFetch(url);
    if (!response.ok) return;
    const data = await response.json();
    setItems((prev) => [...prev, ...data.items]);
    setNextCursor(data.nextCursor ?? null);
  };

  const onSwipe = async (item: any, decision: 'YES' | 'NO') => {
    if (!sessionId) return;
    await apiFetch(`/sessions/${sessionId}/swipes`, {
      method: 'POST',
      body: JSON.stringify({ placeId: item.place.id, decision }),
    });

    setItems((prev) => prev.slice(1));

    if (items.length < 3) {
      loadNext();
    }
  };

  const onReshuffle = async () => {
    setShowEndModal(false);
    setItems([]);
    setNextCursor(0);
    await loadDeck();
  };

  const onExpand = async () => {
    if (!sessionId || !coords) return;
    setShowEndModal(false);
    const response = await apiFetch(`/sessions/${sessionId}/deck/expand`, {
      method: 'POST',
      body: JSON.stringify({ lat: coords.lat, lng: coords.lng, mode: 'ANY', maxMinutes: 45 }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setItems((prev) => [...prev, ...data.items]);
  };

  useEffect(() => {
    if (coords && sessionId) {
      loadDeck();
    }
  }, [coords, sessionId]);

  const photoProxyBase = useMemo(() => baseUrl, []);

  if (!coords) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Location needed</Text>
        <Text style={styles.subtitle}>
          Enable location to find nearby restaurants, or enter a manual location.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Latitude"
          value={manualLat}
          onChangeText={setManualLat}
        />
        <TextInput
          style={styles.input}
          placeholder="Longitude"
          value={manualLng}
          onChangeText={setManualLng}
        />
        <Pressable
          style={styles.button}
          onPress={() => setCoords({ lat: Number(manualLat), lng: Number(manualLng) })}
        >
          <Text style={styles.buttonText}>Use manual location</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.title}>No cards yet</Text>
          <Pressable style={styles.button} onPress={loadDeck}>
            <Text style={styles.buttonText}>Load nearby places</Text>
          </Pressable>
        </View>
      ) : (
        <SwipeDeck items={items} onSwipe={onSwipe} photoProxyBase={photoProxyBase} />
      )}

      <Modal visible={showEndModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>You’ve swiped all close places</Text>
            <Pressable style={styles.button} onPress={onReshuffle}>
              <Text style={styles.buttonText}>Reshuffle close places</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={onExpand}>
              <Text style={styles.secondaryButtonText}>Expand search</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.secondary,
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.muted,
  },
  input: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    padding: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
  },
  secondaryButton: {
    marginTop: spacing.md,
    backgroundColor: '#fff',
    borderColor: colors.primary,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
});
