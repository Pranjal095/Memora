import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API = Constants.expoConfig?.extra?.backendUrl;

interface Photo {
  id: number;
  url: string;
  note?: string;
  created_at: string;
}

export default function Photos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setRefreshing(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axios.get(API + '/photos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const pickAndUpload = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.length) {
      setImageUri(res.assets[0].uri);
    }
  };

  const upload = async () => {
    if (!imageUri) return;
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const form = new FormData();
      form.append('photo', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg'
      } as any);
      form.append('note', note);
      await axios.post(API + '/photos', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setImageUri(undefined);
      setNote('');
      fetchPhotos();
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem: ListRenderItem<Photo> = ({ item }) => (
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
      <Text style={styles.header}>My Gallery</Text>
      <View style={styles.uploadSection}>
        <TouchableOpacity style={styles.uploadButton} onPress={pickAndUpload}>
          <Text style={styles.uploadText}>+ Add Photo</Text>
        </TouchableOpacity>
        {imageUri && (
          <View style={styles.previewSection}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <TextInput
              style={styles.input}
              placeholder="Add a note..."
              placeholderTextColor="#888"
              value={note}
              onChangeText={setNote}
            />
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={upload}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#121212" />
                : <Text style={styles.uploadText}>Upload</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
      <FlatList
        data={photos}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchPhotos} />
        }
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No photos yet. Tap "+ Add Photo" to get started!
              </Text>
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 16
  },
  uploadSection: { paddingHorizontal: 16 },
  uploadButton: {
    backgroundColor: '#0ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12
  },
  uploadText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '700'
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 16
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 12
  },
  input: {
    width: '100%',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 18
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 16
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6
  },
  note: {
    color: '#fff',
    fontSize: 12
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: '#888',
    fontSize: 16
  }
});