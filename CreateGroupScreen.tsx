import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState('');
  const [searchId, setSearchId] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    // Fetch all users except yourself
    const { data } = await supabase.from('profiles').select('*').neq('id', user?.id);
    if (data) setAllUsers(data);
    setLoading(false);
  };

  const toggleUserSelection = (user: any) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const createGroup = async () => {
    if (groupName.trim() === '') return Alert.alert("Error", "Please enter a group name");
    if (selectedUsers.length === 0) return Alert.alert("Error", "Please select at least one member");

    setLoading(true);
    const memberIds = selectedUsers.map(u => u.id);

    const { data: chatId, error } = await supabase.rpc('create_group_chat', {
      group_name: groupName,
      member_ids: memberIds
    });

    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      navigation.replace('Chat', { chatId, name: groupName, isGroup: true });
    }
  };

  const filteredUsers = allUsers.filter(u => u.display_id.includes(searchId) || u.username?.toLowerCase().includes(searchId.toLowerCase()));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#16112B', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>New Group</Text>
          <TouchableOpacity onPress={createGroup}>
            <Text style={{ color: '#8E2DE2', fontWeight: 'bold', fontSize: 16 }}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.groupAvatar}>
            <Ionicons name="people" size={40} color="#fff" />
          </View>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Group Subject"
            placeholderTextColor="#666"
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>

        <View style={styles.searchSection}>
          <Ionicons name="search" size={20} color="#888" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID or Name..."
            placeholderTextColor="#888"
            value={searchId}
            onChangeText={setSearchId}
          />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={styles.sectionTitle}>Select Members ({selectedUsers.length})</Text>
          {loading ? <ActivityIndicator color="#8E2DE2" /> : filteredUsers.map(user => {
            const isSelected = selectedUsers.find(u => u.id === user.id);
            return (
              <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => toggleUserSelection(user)}>
                <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.avatar}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{user.username?.charAt(0) || user.display_id}</Text>
                </LinearGradient>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.username || `User ${user.display_id}`}</Text>
                  <Text style={styles.userId}>#{user.display_id}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  inputSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  groupAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#302b63', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  groupNameInput: { flex: 1, color: '#fff', fontSize: 20, borderBottomWidth: 1, borderBottomColor: '#8E2DE2', paddingVertical: 10 },
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 20, paddingHorizontal: 15, borderRadius: 15, marginBottom: 20 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 15, fontSize: 16 },
  sectionTitle: { color: '#8E2DE2', marginLeft: 20, marginBottom: 10, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  avatar: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  userId: { color: '#888', fontSize: 12, marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#8E2DE2', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#8E2DE2' }
});
