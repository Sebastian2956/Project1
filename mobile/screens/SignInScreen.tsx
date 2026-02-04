import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { startMagicLink, verifyMagicLink } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../styles/theme';

export function SignInScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'SignIn'>) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);

  const onSubmit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const start = await startMagicLink(email.trim());
      if (start.verificationToken) {
        const verified = await verifyMagicLink(start.verificationToken);
        await setTokens(verified.accessToken, verified.refreshToken);
        navigation.replace('Home');
      } else {
        Alert.alert('Check your email', 'A sign-in link has been sent.');
      }
    } catch (error) {
      Alert.alert('Sign-in failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SwipeBite</Text>
      <Text style={styles.subtitle}>Sign in to start swiping with your group.</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Send magic link'}</Text>
      </Pressable>
      <Text style={styles.privacy}>We only use your location to find nearby restaurants. We don’t store location history.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.secondary,
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.muted,
  },
  input: {
    marginTop: spacing.lg,
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
  privacy: {
    marginTop: spacing.lg,
    color: colors.muted,
    fontSize: 12,
  },
});
