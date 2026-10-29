import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, Image, TextInput, Animated, PanResponder, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from './supabase';
import { useFocusEffect } from '@react-navigation/native';

// --- SWIPE TO ARCHIVE COMPONENT ---
const SwipeableChatItem = ({ item, onPress, onArchive }) => {
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 15,
      onPanResponderMove: Animated.event([null, { dx: pan }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -80) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onArchive(item);
        }
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  const translateX = pan.interpolate({ inputRange: [-100, 0], outputRange: [-80, 0], extrapolate: 'clamp' });

  return (
    <View style={{ position: 'relative' }}>
      {/* Background Archive Icon */}
      <View style={{ position: 'absolute', right: 20, top: 25 }}>
        <Ionicons name="archive" size={24} color="#8E2DE2" />
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity style={styles.chatItem} onPress={onPress}>
          {item.other_user_avatar ? (
            <Image source={{ uri: item.other_user_avatar }} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatar}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>#{item.other_user_id}</Text>
            </LinearGradient>
          )}
          <View style={styles.chatInfo}>
            <View style={styles.chatRow}>
              <Text style={styles.chatName}>{item.other_user_name || `User ${item.other_user_id}`}</Text>
            </View>
            <View style={styles.chatRow}>
              <Text style={[styles.chatMessage, item.unread_count > 0 && { color: '#fff', fontWeight: 'bold' }]} numberOfLines={1}>
                {item.last_message || 'Start chatting...'}
              </Text>
              {item.unread_count > 0 && (
                <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unread_count}</Text></View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function ChatList({ navigation }: any) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useFocusEffect(React.useCallback(() => { fetchChats(); }, []));

  const fetchChats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data, error } = await supabase.rpc('get_user_chats');
    if (!error && data) setChats(data);
    setLoading(false);
  };

  const handleArchive = async (chat: any) => {
    setChats(prev => prev.filter(c => c.chat_id !== chat.chat_id)); // Optimistic UI
    await supabase.from('chat_members').update({ archived: true }).eq('chat_id', chat.chat_id).eq('user_id', userId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openAIChat = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: chatId, error } = await supabase.rpc('get_or_create_direct_chat', { user1_id: user.id, user2_id: '00000000-0000-0000-0000-000000000000' });
    if (!error && chatId) navigation.navigate('Chat', { chatId, name: 'BadDay AI', avatar_url: null, isAI: true });
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from('profiles').select('*').or(`display_id.eq.${text},username.ilike.%${text}%`).neq('id', userId).limit(5);
    if (data) setSearchResults(data);
  };

  const startChatWithUser = async (otherUser: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!userId) return;
    const { data: chatId } = await supabase.rpc('get_or_create_direct_chat', { user1_id: userId, user2_id: otherUser.id });
    if (chatId) { setSearchQuery(''); setSearchResults([]); navigation.navigate('Chat', { chatId, name: otherUser.username || `User ${otherUser.display_id}`, avatar_url: otherUser.avatar_url, otherUserId: otherUser.id }); }
  };

  // Filter out archived chats for the main list
  const activeChats = chats.filter(c => c.other_user_id !== userId && c.other_user_id !== '000' && !c.is_archived);
  const filteredChats = activeChats.filter(c => c.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.other_user_id?.includes(searchQuery));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#16112B', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        
        {/* HEADER */}
        <BlurView intensity={60} tint="dark" style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>BADDAY</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('ArchivedChats'); }} style={{ padding: 5, marginRight: 15 }}>
                <Ionicons name="archive" size={28} color="#8E2DE2" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('NewChat'); }} style={{ padding: 5 }}>
                <Ionicons name="add-circle" size={34} color="#8E2DE2" />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={{ marginRight: 10 }} />
          <TextInput style={styles.searchInput} placeholder="Search by name or #ID..." placeholderTextColor="#888" value={searchQuery} onChangeText={handleSearch} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}><Ionicons name="close-circle" size={20} color="#888" /></TouchableOpacity>
          )}
        </View>

        {loading && chats.length === 0 ? (
          <ActivityIndicator size="large" color="#8E2DE2" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.chat_id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                {/* GLOBAL SEARCH RESULTS */}
                {searchResults.length > 0 && (
                  <View style={styles.searchResultsSection}>
                    <Text style={styles.sectionTitle}>Global Results</Text>
                    {searchResults.map(user => (
                      <TouchableOpacity key={user.id} style={styles.chatItem} onPress={() => startChatWithUser(user)}>
                        {user.avatar_url ? <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} /> : (
                          <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatar}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>#{user.display_id}</Text></LinearGradient>
                        )}
                        <View style={styles.chatInfo}><Text style={styles.chatName}>{user.username || `User ${user.display_id}`}</Text><Text style={styles.chatMessage}>Tap to start chatting</Text></View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* AI BANNER */}
                {searchQuery.length === 0 && (
                  <TouchableOpacity onPress={openAIChat} style={styles.aiBanner}>
                    <LinearGradient colors={['#1A0B2E', '#302b63']} style={styles.aiBannerGradient}>
                      <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.aiAvatar}><Ionicons name="skull" size={24} color="#fff" /></LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.aiName}>BadDay AI</Text>
                        <Text style={styles.aiMessage}>I am always here to listen...</Text>
                      </View>
                      <Ionicons name="sparkles" size={20} color="#8E2DE2" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            }
            ListEmptyComponent={
              searchQuery.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                  <Ionicons name="chatbubbles-outline" size={60} color="#333" />
                  <Text style={{ color: '#888', marginTop: 15 }}>No chats yet. Tap + to start.</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <SwipeableChatItem 
                item={item} 
                onArchive={handleArchive}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Chat', { chatId: item.chat_id, name: item.other_user_name || `User ${item.other_user_id}`, avatar_url: item.other_user_avatar, otherUserId: item.other_user_uuid });
                }} 
              />
            )}
          />
        )}

        {/* FLOATING PROFILE BUTTON */}
        <TouchableOpacity style={styles.floatingProfileBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Profile'); }}>
          <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.profileGradient}>
            <Ionicons name="person" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 15, marginTop: 10, paddingHorizontal: 15, borderRadius: 15 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 16 },
  sectionTitle: { color: '#8E2DE2', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 15, marginBottom: 5 },
  searchResultsSection: { marginTop: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 10 },
  aiBanner: { marginHorizontal: 15, marginTop: 15, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(142,45,226,0.3)' },
  aiBannerGradient: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  aiAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  aiName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  aiMessage: { color: '#aaa', fontSize: 14, marginTop: 2 },
  listContent: { paddingVertical: 10, flexGrow: 1 },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#09090E' }, 
  avatar: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarImage: { width: 55, height: 55, borderRadius: 27.5, marginRight: 15 },
  chatInfo: { flex: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingBottom: 15, justifyContent: 'center' },
  chatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  chatName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  chatMessage: { color: '#aaa', fontSize: 14, flex: 1, marginRight: 10 },
  unreadBadge: { backgroundColor: '#8E2DE2', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  floatingProfileBtn: { position: 'absolute', bottom: 90, right: 20, elevation: 5 },
  profileGradient: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }
});
