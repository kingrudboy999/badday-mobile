import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from './supabase';
import { useFocusEffect } from '@react-navigation/native';

export default function ArchivedChats({ navigation }: any) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useFocusEffect(React.useCallback(() => { fetchArchived(); }, []));

  const fetchArchived = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
    const { data, error } = await supabase.rpc('get_user_chats');
    if (!error && data) {
      // Filter only archived chats
      setChats(data.filter((c: any) => c.is_archived && c.other_user_id !== userId));
    }
    setLoading(false);
  };

  const handleUnarchive = async (chatId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await supabase.from('chat_members').update({ archived: false }).eq('chat_id', chatId).eq('user_id', userId);
    fetchArchived();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#16112B', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        
        <BlurView intensity={60} tint="dark" style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color="#fff" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Archived</Text>
            <View style={{ width: 28 }} />
          </View>
        </BlurView>

        {loading ? <ActivityIndicator size="large" color="#8E2DE2" style={{ marginTop: 50 }} /> : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.chat_id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 50 }}>No archived chats.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.chatItem} onPress={() => navigation.navigate('Chat', { chatId: item.chat_id, name: item.other_user_name, avatar_url: item.other_user_avatar, otherUserId: item.other_user_uuid })}>
                {item.other_user_avatar ? (
                  <Image source={{ uri: item.other_user_avatar }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatar}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>#{item.other_user_id}</Text></LinearGradient>
                )}
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{item.other_user_name || `User ${item.other_user_id}`}</Text>
                  <Text style={styles.chatMessage} numberOfLines={1}>{item.last_message || 'Start chatting...'}</Text>
                </View>
                <TouchableOpacity onPress={() => handleUnarchive(item.chat_id)} style={{ padding: 10 }}>
                  <Ionicons name="arrow-up-circle" size={28} color="#8E2DE2" />
                </TouchableOpacity>
              </TouchableOpacity>
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
  header: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  listContent: { paddingVertical: 10 },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  avatar: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarImage: { width: 55, height: 55, borderRadius: 27.5, marginRight: 15 },
  chatInfo: { flex: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingBottom: 15, justifyContent: 'center' },
  chatName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  chatMessage: { color: '#aaa', fontSize: 14, marginTop: 5 }
});
