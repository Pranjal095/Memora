import React, { useEffect, useState } from 'react';
import { Slot, Redirect, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    SecureStore.getItemAsync('token')
      .then(token => setAuthed(!!token))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0ff" />
      </View>
    );
  }

  const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';

  // if not authed & not in /login or /signup → send to login
  if (!authed && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  // if authed & trying to visit /login or /signup → send home
  if (authed && inAuthGroup) {
    return <Redirect href="/" />;
  }

  return <Slot />;
}
