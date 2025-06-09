import React, { useState } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import Constants from "expo-constants";

const API = Constants.expoConfig?.extra?.backendUrl;

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setError("");
    try {
      await axios.post(`${API}/signup`, { email, password });
      router.push("/login");
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EchoCast</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#777"
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#777"
        secureTextEntry
        onChangeText={setPassword}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    marginBottom: 24,
    textAlign: "center",
    color: "#fff",
  },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#eee",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#0ff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: {
    color: "#121212",
    fontSize: 18,
    fontWeight: "700",
  },
  link: {
    textAlign: "center",
    marginTop: 16,
    color: "#0ff",
  },
  error: {
    color: "#f55",
    marginBottom: 8,
    textAlign: "center",
  },
});