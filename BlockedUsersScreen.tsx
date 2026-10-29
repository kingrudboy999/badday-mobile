import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function BlockedUsersScreen({ navigation }: any) {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBlocked(); }, []);

  const fetchBlocked = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('blocked_users')
      .select('blocked_id, profiles!blocked_users_blocked_id_fkey(username, display_id, avatar_url)')
      .eq('blocker_id', user.id);

    if (data) setBlockedUsers(data);
    setLoading(false);
  };

  const unblockUser = async (blockedId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    Alert.alert("Unblock", "Are you sure you want to unblock this user?", [
      { text: "Cancel", style: "cancel" },
      { text: "Unblock", onPress: async () => {
        await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId);
        fetchBlocked();
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#1A0B2E', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? <ActivityIndicator color="#8E2DE2" style={{ marginTop: 50 }} /> : (
          <FlatList
            data={blockedUsers}
            keyExtractor={(item) => item.blocked_id}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 50 }}>You haven't blocked anyone.</Text>}
            renderItem={({ item }) => (
              <View style={styles.userItem}>
                {item.profiles?.avatar_url ? (
                  <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={['#302b63', '#24243e']} style={styles.avatar}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>#{item.profiles?.display_id}</Text>
                  </LinearGradient>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.profiles?.username || `User ${item.profiles?.display_id}`}</Text>
                </View>
                <TouchableOpacity style={styles.unblockBtn} onPress={() => unblockUser(item.blocked_id)}>
                  <Text style={styles.unblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  userItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 15, marginBottom: 10 },
  avatar: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  unblockBtn: { backgroundColor: 'rgba(255,68,68,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  unblockText: { color: '#ff4444', fontWeight: 'bold', fontSize: 12 }
});
