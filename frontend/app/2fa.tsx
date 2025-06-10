import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API = Constants.expoConfig?.extra?.backendUrl;

export default function Verify2FA() {
  const router = useRouter();
  const { username, next } = useLocalSearchParams<{ username: string; next?: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/2fa/verify`, { username, code });
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('username', username);
      router.replace(next || '/');
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Two Factor Authentication</Text>
        <Text style={styles.description}>
          Enter the 6-digit code we just sent to your email address.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="123456"
          placeholderTextColor="#777"
          keyboardType="numeric"
          value={code}
          onChangeText={setCode}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#121212" />
            : <Text style={styles.buttonText}>Verify</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#eee',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#055',
  },
  buttonText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: '700',
  },
  error: {
    color: '#f55',
    textAlign: 'center',
    marginBottom: 8,
  },
});