import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  TextInput,
  Pressable,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

const API = Constants.expoConfig?.extra?.backendUrl;

interface Photo {
  id: number;
  url: string;
  note?: string;
  created_at: string;
}

interface Hit {
  id: string;
  score: number;
  payload: { note?: string; caption?: string };
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [results, setResults] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('token');
      try {
        const { data } = await axios.get<Photo[]>(`${API}/photos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPhotos(data);
        setResults(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults(photos);
      return;
    }
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axios.get<Hit[]>(`${API}/search`, {
        params: { q: query },
        headers: { Authorization: `Bearer ${token}` },
      });
      const ids = data.map(h => parseInt(h.id, 10));
      setResults(photos.filter(p => ids.includes(p.id)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Photo }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.url }} style={styles.image} />
      {item.note ? (
        <View style={styles.overlay}>
          <Text style={styles.note}>{item.note}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>
      <View style={styles.searchSection}>
        <TextInput
          style={styles.input}
          placeholder="Search photos…"
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
        <Pressable style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Go</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#0ff" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No results</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  backButton: { padding: 16 },
  backText: { color: '#0ff', fontSize: 16 },
  searchSection: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 8,
    padding: 12
  },
  button: {
    marginLeft: 8,
    backgroundColor: '#0ff',
    padding: 12,
    borderRadius: 8
  },
  buttonText: { color: '#121212', fontWeight: '700' },
  list: { paddingHorizontal: 8, paddingBottom: 16 },
  card: { flex: 1, margin: 8, borderRadius: 12, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6
  },
  note: { color: '#fff', fontSize: 12 },
  empty: { color: '#888', textAlign: 'center', marginTop: 20 }
});