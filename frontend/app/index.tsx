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
  ScrollView,
} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;

export default function HomeScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ label: string; probability: number } | null>(null);
  const [error, setError] = useState<string>('');

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const { data } = await axios.post(`${BACKEND_URL}/analyze`, { url });
      setResult(data);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>EchoCast</Text>
        <Text style={styles.description}>
          Welcome to EchoCast — your powerful AI powered audio forensics tool.
        </Text>
        <Text style={styles.description}>
          Paste a YouTube, Instagram
          Reel, or direct audio link below, and discover if the speech is human-spoken or AI-generated
          in seconds.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Paste URL or audio link..."
          placeholderTextColor="#777"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable
          style={[styles.button, !url || loading ? styles.buttonDisabled : null]}
          onPress={analyze}
          disabled={!url || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Analyzing...' : 'Analyze Now'}</Text>
        </Pressable>

        {loading && <ActivityIndicator style={styles.loader} size="large" color="#0ff" />}

        {result && (
          <View style={styles.card}>
            <Text
              style={[
                styles.cardTitle,
                result.label === 'AI-generated' ? styles.alert : styles.safe,
              ]}
            >
              {result.label === 'AI-generated' ? '🚨 AI-GENERATED' : '✅ HUMAN'}
            </Text>
            <Text style={styles.cardText}>
              Confidence: {(result.probability * 100).toFixed(1)}%
            </Text>
          </View>
        )}

        {error.length > 0 && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 104,
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 22,
    paddingHorizontal: 12,
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
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 18,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 24,
  },
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  alert: {
    color: '#f55',
  },
  safe: {
    color: '#5f5',
  },
  cardText: {
    fontSize: 18,
    color: '#ddd',
  },
  error: {
    color: '#f55',
    textAlign: 'center',
    marginTop: 20,
  },
});