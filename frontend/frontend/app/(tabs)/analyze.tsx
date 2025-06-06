import React, { useState } from 'react';
import { StyleSheet, TextInput, Button, View, ActivityIndicator, Text } from 'react-native';
import axios from 'axios';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function AnalyzeScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ label: string; probability: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const { data } = await axios.post('http://YOUR_BACKEND_HOST:8000/analyze', { url });
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Paste YouTube/Instagram URL or audio file"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="Analyze" onPress={onSubmit} disabled={loading || !url} />
      {loading && <ActivityIndicator style={styles.loader} />}
      {result && (
        <View style={styles.card}>
          <ThemedText type="title">
            {result.label === 'AI-generated' ? '🚨 AI-Generated' : '✅ Human-Spoken'}
          </ThemedText>
          <ThemedText>{(result.probability * 100).toFixed(1)}% confidence</ThemedText>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    borderColor: '#888',
  },
  loader: { marginTop: 16 },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  error: { marginTop: 16, color: 'red' },
});