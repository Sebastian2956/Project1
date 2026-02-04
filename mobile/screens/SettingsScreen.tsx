import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { colors, spacing } from '../styles/theme';

const modes = ['WALK', 'DRIVE', 'ANY'] as const;

type Mode = (typeof modes)[number];

export function SettingsScreen() {
  const [mode, setMode] = useState<Mode>('ANY');
  const [maxMinutes, setMaxMinutes] = useState('20');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filters</Text>
      <Text style={styles.label}>Travel mode</Text>
      <View style={styles.row}>
        {modes.map((m) => (
          <Pressable key={m} style={[styles.chip, mode === m && styles.chipActive]} onPress={() => setMode(m)}>
            <Text style={mode === m ? styles.chipTextActive : styles.chipText}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Max travel minutes</Text>
      <TextInput
        style={styles.input}
        value={maxMinutes}
        onChangeText={setMaxMinutes}
        keyboardType="numeric"
      />
      <Text style={styles.helper}>Filters apply when you initialize or expand the deck.</Text>
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
    fontSize: 20,
    fontWeight: '600',
    color: colors.secondary,
  },
  label: {
    marginTop: spacing.lg,
    color: colors.secondary,
  },
  row: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.primary,
  },
  chipTextActive: {
    color: '#fff',
  },
  input: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  helper: {
    marginTop: spacing.md,
    color: colors.muted,
  },
});
