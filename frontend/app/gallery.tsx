import React, { useEffect, useState } from 'react';
import { View, Button, Image, FlatList, TextInput, Text, StyleSheet, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API = Constants.expoConfig?.extra?.backendUrl;

export default function Photos() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string>();

  useEffect(() => {
    fetch();
  }, []);

  const fetch = async () => {
    const token = await SecureStore.getItemAsync('token');
    const { data } = await axios.get(API + '/photos', { headers: { Authorization: `Bearer ${token}` } });
    setPhotos(data);
  };

  const pickAndUpload = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled && res.assets?.length) {
      setImageUri(res.assets[0].uri);
    }
  };

  const upload = async () => {
    const token = await SecureStore.getItemAsync('token');
    const form = new FormData();
    form.append('photo', { uri: imageUri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    form.append('note', note);
    await axios.post(API + '/photos', form, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}` 
      }
    });
    setImageUri(undefined);
    setNote('');
    fetch();
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Pressable style={styles.button} onPress={pickAndUpload}><Text style={styles.btnText}>Pick Photo</Text></Pressable>
      {imageUri && (
        <>
          <Image source={{ uri: imageUri }} style={{ width: 200, height: 200, marginTop: 8 }} />
          <TextInput 
            placeholder="Add a note (optional)" 
            value={note} 
            onChangeText={setNote} 
            style={styles.input} 
          />
          <Pressable style={styles.button} onPress={upload}><Text style={styles.btnText}>Upload</Text></Pressable>
        </>
      )}
      <FlatList
        data={photos}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.url }} style={{ width: 100, height: 100 }} />
            {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#0ff', padding: 12, borderRadius: 6, marginTop: 8 },
  btnText: { color: '#121212', textAlign: 'center', fontWeight: '600' },
  input: { borderColor: '#333', borderWidth: 1, padding: 8, marginTop: 8, borderRadius: 4 },
  card: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  note: { marginLeft: 8, color: '#fff' },
});