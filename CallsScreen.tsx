import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { useFocusEffect } from '@react-navigation/native';

export default function CallsScreen({ navigation }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(React.useCallback(() => { fetchLogs(); }, []));

  const fetchLogs = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch logs and join with profiles to get the other person's details
    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        caller:caller_id(username, avatar_url, display_id),
        receiver:receiver_id(username, avatar_url, display_id)
      `)
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) setLogs(data);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#16112B', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        
        <BlurView intensity={60} tint="dark" style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Calls</Text>
          </View>
        </BlurView>

        {loading ? <ActivityIndicator size="large" color="#8E2DE2" style={{ marginTop: 50 }} /> : (
          <FlatList
            data={logs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 50 }}>No recent calls.</Text>}
            renderItem={({ item }) => {
              // We need the current user ID to know if it was incoming or outgoing
              const isOutgoing = item.caller_id === supabase.auth.currentUser?.id;
              const otherPerson = isOutgoing ? item.receiver : item.caller;

              return (
                <TouchableOpacity style={styles.callItem}>
                  {otherPerson?.avatar_url ? (
                    <Image source={{ uri: otherPerson.avatar_url }} style={styles.avatar} />
                  ) : (
                    <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatar}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>{otherPerson?.username?.charAt(0)}</Text>
                    </LinearGradient>
                  )}
                  
                  <View style={styles.callInfo}>
                    <Text style={styles.callName}>{otherPerson?.username || `User ${otherPerson?.display_id}`}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={isOutgoing ? "arrow-up" : "arrow-down"} size={14} color={isOutgoing ? "#00FF88" : "#ff4444"} />
                      <Text style={styles.callDetails}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => navigation.navigate('Call', { receiverId: otherPerson.id, name: otherPerson.username, avatar_url: otherPerson.avatar_url, type: 'audio' })}>
                    <Ionicons name={item.type === 'video' ? "videocam" : "call"} size={24} color="#8E2DE2" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 35 : 0, paddingBottom: 70 },
  header: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 2 },
  listContent: { paddingVertical: 10 },
  callItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  avatar: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  callInfo: { flex: 1 },
  callName: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 4 },
  callDetails: { color: '#888', fontSize: 13, marginLeft: 5 },
});
