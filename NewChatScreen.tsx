import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function NewChatScreen({ navigation }: any) {
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);

  const searchUser = async () => {
    if (searchId.length < 3) return Alert.alert("Error", "Please enter a 3-digit ID");
    setLoading(true);
    setFoundUser(null);

    const { data, error } = await supabase.from('profiles').select('*').eq('display_id', searchId).single();

    if (error || !data) Alert.alert("Not Found", "No user found with this ID.");
    else setFoundUser(data);
    
    setLoading(false);
  };

  const startChat = async () => {
    if (!foundUser) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: chatId, error } = await supabase.rpc('get_or_create_direct_chat', {
      user1_id: user.id,
      user2_id: foundUser.id
    });

    setLoading(false);
    if (error) Alert.alert("Error", error.message);
    else navigation.replace('Chat', { chatId, name: foundUser.username || `User ${foundUser.display_id}`, avatar: foundUser.avatar_url });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#16112B', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find User</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter ID (e.g. 002)"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={3}
              value={searchId}
              onChangeText={setSearchId}
            />
            <TouchableOpacity onPress={searchUser} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator size="large" color="#8E2DE2" style={{ marginTop: 40 }} />}

          {foundUser && !loading && (
            <BlurView intensity={30} tint="light" style={styles.profileCard}>
              {/* Cover Photo */}
              <View style={styles.coverWrapper}>
                {foundUser.cover_url ? (
                  <Image source={{ uri: foundUser.cover_url }} style={styles.coverImage} />
                ) : (
                  <LinearGradient colors={['#302b63', '#24243e']} style={styles.coverImage} />
                )}
              </View>

              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                {foundUser.avatar_url ? (
                  <Image source={{ uri: foundUser.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatarImage}>
                     <Text style={{ color: '#fff', fontSize: 30, fontWeight: 'bold' }}>{foundUser.username ? foundUser.username.charAt(0).toUpperCase() : '?'}</Text>
                  </LinearGradient>
                )}
              </View>

              <Text style={styles.userName}>{foundUser.username || `User ${foundUser.display_id}`}</Text>
              <Text style={styles.userId}>#{foundUser.display_id}</Text>

              {foundUser.bio ? <Text style={styles.bio}>{foundUser.bio}</Text> : null}

              <View style={styles.detailsRow}>
                {foundUser.location ? <View style={styles.detailPill}><Ionicons name="location-outline" size={14} color="#aaa" /><Text style={styles.detailText}>{foundUser.location}</Text></View> : null}
                {foundUser.hobbies ? <View style={styles.detailPill}><Ionicons name="game-controller-outline" size={14} color="#aaa" /><Text style={styles.detailText}>{foundUser.hobbies}</Text></View> : null}
              </View>

              <TouchableOpacity onPress={startChat} style={{ width: '100%', marginTop: 20 }}>
                <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.chatBtn}>
                  <Text style={styles.chatBtnText}>Start Chatting</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 10 },
  content: { padding: 20 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, paddingHorizontal: 20, color: '#fff', fontSize: 20, fontWeight: 'bold', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchBtn: { backgroundColor: '#8E2DE2', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 15 },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  
  profileCard: { marginTop: 40, borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', paddingBottom: 25 },
  coverWrapper: { width: '100%', height: 120 },
  coverImage: { width: '100%', height: '100%' },
  avatarWrapper: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: '#1A1B26', overflow: 'hidden', marginTop: -45 },
  avatarImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  userName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  userId: { color: '#8E2DE2', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  bio: { color: '#aaa', textAlign: 'center', paddingHorizontal: 20, marginBottom: 15, fontSize: 14 },
  detailsRow: { flexDirection: 'row', gap: 10 },
  detailPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  detailText: { color: '#aaa', fontSize: 12, marginLeft: 5 },
  chatBtn: { paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
  chatBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
