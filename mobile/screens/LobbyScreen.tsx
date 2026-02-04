import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { RootStackParamList } from '../navigation/types';
import { useSessionStore } from '../store/sessionStore';
import { apiFetch } from '../lib/api';
import { connectRealtime } from '../services/realtime';
import { colors, spacing } from '../styles/theme';

export function LobbyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Lobby'>) {
  const sessionId = useSessionStore((s) => s.sessionId);

  const { data, refetch } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await apiFetch(`/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (sessionId) {
      const socket = connectRealtime(sessionId);
      socket.on('session:update', () => refetch());
      return () => {
        socket.off('session:update');
      };
    }
  }, [sessionId, refetch]);

  const toggleReady = async (isReady: boolean) => {
    await apiFetch(`/sessions/${sessionId}/ready`, {
      method: 'POST',
      body: JSON.stringify({ isReady }),
    });
    refetch();
  };

  if (!data) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{data.name}</Text>
      <Text style={styles.code}>Join code: {data.code}</Text>

      <Text style={styles.sectionTitle}>Members</Text>
      <FlatList
        data={data.members}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Text style={styles.memberName}>{item.user.email}</Text>
            <Text style={styles.memberStatus}>{item.isReady ? 'Ready' : 'Not ready'}</Text>
          </View>
        )}
      />

      <Pressable style={styles.button} onPress={() => toggleReady(true)}>
        <Text style={styles.buttonText}>I am ready</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('SessionTabs')}>
        <Text style={styles.secondaryButtonText}>Start swiping</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  code: {
    marginTop: spacing.sm,
    color: colors.muted,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    fontWeight: '600',
    color: colors.secondary,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DF',
  },
  memberName: {
    color: colors.secondary,
  },
  memberStatus: {
    color: colors.muted,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
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
