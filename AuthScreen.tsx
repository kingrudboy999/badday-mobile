import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Platform, SafeAreaView, KeyboardAvoidingView, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert('Error', 'Fill all fields');
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Success', 'Account created! Please log in.');
        setIsLogin(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#1A0B2E', '#09090E']} style={StyleSheet.absoluteFillObject} />
      {/* ANIMATED WATER ORBS */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          
          <View style={styles.logoContainer}>
            <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.logoAvatar}>
              <Ionicons name="skull" size={40} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>BADDAY</Text>
            <Text style={styles.subtitle}>{isLogin ? 'Welcome back.' : 'Create your account.'}</Text>
          </View>

          <BlurView intensity={25} tint="light" style={styles.glassCard}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity onPress={handleAuth} disabled={loading} style={{ marginTop: 20 }}>
              <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.authButton}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authButtonText}>{isLogin ? 'LOG IN' : 'SIGN UP'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleButton}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Text style={styles.toggleHighlight}>{isLogin ? 'Sign up' : 'Log in'}</Text>
            </Text>
          </TouchableOpacity>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  orb1: { position: 'absolute', top: -50, left: -50, width: 350, height: 350, borderRadius: 175, backgroundColor: '#8E2DE2', opacity: 0.35 },
  orb2: { position: 'absolute', bottom: -50, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: '#4A00E0', opacity: 0.25 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoAvatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: 5 },
  subtitle: { color: '#aaa', fontSize: 16, marginTop: 5 },
  glassCard: { padding: 20, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.03)' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15, marginBottom: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 15 },
  authButton: { paddingVertical: 16, borderRadius: 15, alignItems: 'center' },
  authButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  toggleButton: { marginTop: 20, alignItems: 'center' },
  toggleText: { color: '#888', fontSize: 14 },
  toggleHighlight: { color: '#8E2DE2', fontWeight: 'bold' },
});
