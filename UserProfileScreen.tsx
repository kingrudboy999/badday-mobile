import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function UserProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [userId]);

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#8E2DE2" /></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#1A0B2E', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.coverContainer}>
            <View style={styles.coverImageWrapper}>
              {profile?.cover_url ? <Image source={{ uri: profile.cover_url }} style={styles.coverImage} /> : <LinearGradient colors={['#302b63', '#24243e']} style={styles.coverImage} />}
            </View>

            <View style={styles.avatarWrapper}>
              {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : (
                <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatarImage}>
                  <Text style={{ color: '#fff', fontSize: 30, fontWeight: 'bold' }}>{profile?.username?.charAt(0).toUpperCase() || '?'}</Text>
                </LinearGradient>
              )}
            </View>
          </View>

          <View style={styles.idPillWrapper}>
            <BlurView intensity={40} tint="light" style={styles.idPill}>
              <Text style={styles.idText}>ID: #{profile?.display_id || '---'}</Text>
            </BlurView>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Display Name</Text>
            <View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>{profile?.username || 'BADDAY User'}</Text></View>

            <Text style={styles.label}>Bio</Text>
            <View style={[styles.readOnlyBox, { minHeight: 60 }]}><Text style={styles.readOnlyText}>{profile?.bio || 'No bio yet.'}</Text></View>

            <Text style={styles.label}>Hobbies</Text>
            <View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>{profile?.hobbies || 'Not specified.'}</Text></View>

            <Text style={styles.label}>Location</Text>
            <View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>{profile?.location || 'Not specified.'}</Text></View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  scrollContent: { paddingBottom: 40 },
  coverContainer: { alignItems: 'center', marginBottom: 20 },
  coverImageWrapper: { width: '100%', height: 160 },
  coverImage: { width: '100%', height: '100%' },
  avatarWrapper: { position: 'absolute', bottom: -50, width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#09090E', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  idPillWrapper: { alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  idPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  idText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  formContainer: { paddingHorizontal: 20 },
  label: { color: '#8E2DE2', fontSize: 12, fontWeight: 'bold', marginBottom: 5, marginLeft: 5, textTransform: 'uppercase' },
  readOnlyBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  readOnlyText: { color: '#ddd', fontSize: 16 }
});
