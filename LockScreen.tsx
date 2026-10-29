import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const authenticate = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      onUnlock();
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock BADDAY',
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      onUnlock();
    }
  };

  useEffect(() => { authenticate(); }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#1A0B2E', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.content}>
        <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatar}>
          <Ionicons name="lock-closed" size={50} color="#fff" />
        </LinearGradient>
        <Text style={styles.title}>BADDAY is Locked</Text>
        <Text style={styles.subtitle}>Authenticate to access your messages.</Text>
        <TouchableOpacity style={styles.button} onPress={authenticate}>
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 14, marginTop: 10, marginBottom: 30 },
  button: { backgroundColor: '#8E2DE2', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 25 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
