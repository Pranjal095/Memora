import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;

export default function HomeScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ label: string; probability: number } | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    SecureStore.getItemAsync('username').then(user => {
      if (user) setUsername(user);
    });
  }, []);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('username');
    router.replace('/login');
  };

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axios.post(
        `${BACKEND_URL}/analyze`,
        { url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(data);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome, {username || 'Guest'}</Text>
          <Pressable onPress={handleLogout} style={styles.logoutLink}>
            <Text style={styles.logoutLinkText}>Logout</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Memora</Text>
        <Text style={styles.description}>
          Welcome to Memora, your personal photo gallery and memory assistant.
        </Text>
        <Text style={styles.description}>
          Upload photos with optional notes and use text search to quickly recall your favorite moments.
        </Text>

        <Pressable
          style={[styles.button]}
          onPress={() => router.push('/gallery')}
        >
          <Text style={styles.buttonText}>Go to Gallery</Text>
        </Pressable>

        <Pressable
          style={[styles.button]}
          onPress={() => router.push('/search')}
        >
          <Text style={styles.buttonText}>Search Photos</Text>
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'flex-start',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcome: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 50
  },
  logoutLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 50
  },
  logoutLinkText: {
    color: '#0ff',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 64,
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  button: {
    backgroundColor: '#0ff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#055',
  },
  buttonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 24,
  },
  error: {
    color: '#f55',
    textAlign: 'center',
    marginTop: 20,
  },
});