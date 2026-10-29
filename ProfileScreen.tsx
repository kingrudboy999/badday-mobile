import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, Alert, TextInput, ScrollView, Image, ActivityIndicator, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy'; 
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastAnim] = useState(new Animated.Value(0));

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setUsername(data.username || '');
        setBio(data.bio || '');
        setHobbies(data.hobbies || '');
        setLocation(data.location || '');
        setAvatar(data.avatar_url || null);
        setCover(data.cover_url || null);
      }
    }
    setLoading(false);
  };

  const copyId = async () => {
    if (profile?.display_id) {
      await Clipboard.setStringAsync(profile.display_id);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start();
    }
  };

  const pickImage = async (type: 'avatar' | 'cover') => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (!result.canceled) {
      if (type === 'avatar') setAvatar(result.assets[0].uri);
      else setCover(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string, path: string) => {
    if (uri.startsWith('http')) return uri;
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const arrayBuffer = decode(base64);
    const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let finalAvatar = avatar;
      let finalCover = cover;
      if (avatar && !avatar.startsWith('http')) finalAvatar = await uploadImage(avatar, `${user.id}-avatar.jpg`);
      if (cover && !cover.startsWith('http')) finalCover = await uploadImage(cover, `${user.id}-cover.jpg`);

      const { error } = await supabase.from('profiles').update({
        username, bio, hobbies, location, avatar_url: finalAvatar, cover_url: finalCover
      }).eq('id', user.id);

      if (error) throw error;
      Alert.alert("Success", "Profile updated successfully!");
      setAvatar(finalAvatar);
      setCover(finalCover);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#8E2DE2" /></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#1A0B2E', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Settings")}><Ionicons name="settings-outline" size={24} color="#fff" /></TouchableOpacity>
          <TouchableOpacity onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color="#8E2DE2" /> : <Text style={{ color: '#8E2DE2', fontWeight: 'bold', fontSize: 16 }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.coverContainer}>
            <TouchableOpacity style={styles.coverImageWrapper} onPress={() => pickImage('cover')}>
              {cover ? <Image source={{ uri: cover }} style={styles.coverImage} /> : <LinearGradient colors={['#302b63', '#24243e']} style={styles.coverImage} />}
              <View style={styles.editBadge}><Ionicons name="camera" size={16} color="#fff" /></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.avatarWrapper} onPress={() => pickImage('avatar')}>
              {avatar ? <Image source={{ uri: avatar }} style={styles.avatarImage} /> : (
                <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatarImage}>
                  <Text style={{ color: '#fff', fontSize: 30, fontWeight: 'bold' }}>{username ? username.charAt(0).toUpperCase() : '?'}</Text>
                </LinearGradient>
              )}
              <View style={styles.editBadge}><Ionicons name="camera" size={16} color="#fff" /></View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={copyId} style={styles.idPillWrapper}>
            <BlurView intensity={40} tint="light" style={styles.idPill}>
              <Text style={styles.idText}>ID: #{profile?.display_id || '---'}</Text>
              <Ionicons name="copy-outline" size={16} color="#8E2DE2" style={{ marginLeft: 8 }} />
            </BlurView>
          </TouchableOpacity>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Your name" placeholderTextColor="#666" />
            <Text style={styles.label}>Bio</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={bio} onChangeText={setBio} placeholder="Tell people about yourself..." placeholderTextColor="#666" multiline />
            <Text style={styles.label}>Hobbies</Text>
            <TextInput style={styles.input} value={hobbies} onChangeText={setHobbies} placeholder="Gaming, Music, Coding..." placeholderTextColor="#666" />
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="City, Country" placeholderTextColor="#666" />
          </View>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="#ff4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

        </ScrollView>

        <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <Ionicons name="checkmark-circle" size={20} color="#00FF88" />
          <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '600' }}>ID Copied to Clipboard!</Text>
        </Animated.View>
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
  coverImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarWrapper: { position: 'absolute', bottom: -50, width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#09090E', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4A00E0', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#09090E' },
  idPillWrapper: { alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  idPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  idText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  formContainer: { paddingHorizontal: 20 },
  label: { color: '#8E2DE2', fontSize: 12, fontWeight: 'bold', marginBottom: 5, marginLeft: 5, textTransform: 'uppercase' },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 15, color: '#fff', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  logoutButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, marginHorizontal: 20, padding: 15, backgroundColor: 'rgba(255,68,68,0.1)', borderRadius: 15 },
  logoutText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  toast: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }
});
