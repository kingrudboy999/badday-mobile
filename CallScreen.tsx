import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

// NOTE: LiveKit imports are removed to prevent Expo Go crash.
// To enable real calls, you must build a Development Client and uncomment the LiveKit code.

export default function CallScreen({ route, navigation }: any) {
  const { receiverId, name, chatId, type } = route.params;
  const [callTime, setCallTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // SIMULATED CONNECTION (Replaces LiveKit WebRTC for Expo Go)
    const connectTimeout = setTimeout(() => {
      setIsConnected(true);
    }, 2000); // Pretend it takes 2 seconds to connect

    const timer = setInterval(() => setCallTime(prev => prev + 1), 1000);
    
    return () => {
      clearTimeout(connectTimeout);
      clearInterval(timer);
    };
  }, [chatId]);

  const endCall = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('call_logs').insert({
        caller_id: user.id,
        receiver_id: receiverId,
        type: type === 'video' ? 'video' : 'audio',
        status: 'answered'
      });
    }
    navigation.goBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A0B2E', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.callInfo}>
          <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatar}>
             <Text style={{ color: '#fff', fontSize: 40, fontWeight: 'bold' }}>{name?.charAt(0)}</Text>
          </LinearGradient>
          <Text style={styles.callerName}>{name}</Text>
          <Text style={styles.callStatus}>{isConnected ? formatTime(callTime) : 'Connecting...'}</Text>
          {!isConnected && <ActivityIndicator color="#8E2DE2" style={{ marginTop: 10 }} />}
        </View>

        <View style={styles.controlsContainer}>
          <BlurView intensity={40} tint="dark" style={styles.controls}>
            <TouchableOpacity style={[styles.controlBtn, isMuted && { backgroundColor: '#ff4444' }]} onPress={() => setIsMuted(!isMuted)}>
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#ff4444', width: 70, height: 70, borderRadius: 35 }]} onPress={endCall}>
              <Ionicons name="call" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, isSpeaker && { backgroundColor: '#8E2DE2' }]} onPress={() => setIsSpeaker(!isSpeaker)}>
              <Ionicons name="volume-high" size={30} color="#fff" />
            </TouchableOpacity>
          </BlurView>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingVertical: 50 },
  callInfo: { alignItems: 'center', marginTop: 100 },
  avatar: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  callerName: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  callStatus: { color: '#8E2DE2', fontSize: 16, marginTop: 10, fontWeight: '500' },
  controlsContainer: { alignItems: 'center' },
  controls: { flexDirection: 'row', padding: 20, borderRadius: 50, overflow: 'hidden', alignItems: 'center' },
  controlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 15 },
});
