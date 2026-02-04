import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { colors, spacing } from '../styles/theme';

export function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const setSession = useSessionStore((s) => s.setSession);

  const createSession = async () => {
    if (!name) return;
    try {
      const response = await apiFetch('/sessions', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setSession(data.id, data.code);
      navigation.navigate('Lobby');
    } catch {
      Alert.alert('Could not create session');
    }
  };

  const joinSession = async () => {
    if (!code) return;
    try {
      const response = await apiFetch('/sessions/join', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setSession(data.id, data.code);
      navigation.navigate('Lobby');
    } catch {
      Alert.alert('Could not join session');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start a session</Text>
      <TextInput
        style={styles.input}
        placeholder="Session name"
        value={name}
        onChangeText={setName}
      />
      <Pressable style={styles.button} onPress={createSession}>
        <Text style={styles.buttonText}>Create session</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Join with code</Text>
      <TextInput
        style={styles.input}
        placeholder="ABC123"
        autoCapitalize="characters"
        value={code}
        onChangeText={setCode}
      />
      <Pressable style={styles.secondaryButton} onPress={joinSession}>
        <Text style={styles.secondaryButtonText}>Join session</Text>
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
    fontSize: 26,
    fontWeight: '700',
    color: colors.secondary,
  },
  sectionTitle: {
    marginTop: spacing.xl,
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
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
