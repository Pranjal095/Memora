import React, { useState } from "react";
import {
    View,
    TextInput,
    Pressable,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import Constants from "expo-constants";

const API = Constants.expoConfig?.extra?.backendUrl;

export default function Signup() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        setError("");
        setLoading(true);
        try {
            await axios.post(`${API}/signup`, { username, email, password });
            await axios.post(`${API}/2fa/setup`, { username });
            router.replace({ pathname: "/2fa", params: { username, next: "/gallery" } });
        } catch (e: any) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Memora</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#777"
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />
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

                <Pressable
                    style={[styles.button, (loading || !username || !email || !password) && styles.buttonDisabled]}
                    onPress={handleSignup}
                    disabled={loading || !username || !email || !password}
                >
                    {loading
                        ? <ActivityIndicator color="#121212" />
                        : <Text style={styles.buttonText}>Sign Up</Text>
                    }
                </Pressable>

                <Pressable onPress={() => router.push("/login")}>
                    <Text style={styles.link}>Already have an account? Log in</Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: {
        flexGrow: 1,
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
    buttonDisabled: {
        backgroundColor: "#055",
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