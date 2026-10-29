import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, Switch, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function AppSettingsScreen({ navigation }: any) {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure? This will permanently delete your profile, messages, and account. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Forever", style: "destructive", onPress: deleteAccount }
      ]
    );
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const { error } = await supabase.rpc('delete_user_account');
    
    if (error) {
      Alert.alert("Error", error.message);
      setDeleting(false);
    } else {
      await supabase.auth.signOut(); // This will kick them to the Auth screen
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#1A0B2E', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>
          
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="notifications-outline" size={22} color="#8E2DE2" />
              <Text style={styles.rowText}>Push Notifications</Text>
              <Switch 
                value={notificationsOn} 
                onValueChange={setNotificationsOn}
                trackColor={{ false: '#333', true: '#8E2DE2' }}
              />
            </View>
            <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('BlockedUsers')}>
              <Ionicons name="ban-outline" size={22} color="#8E2DE2" />
              <Text style={styles.rowText}>Blocked Users</Text>
              <Ionicons name="chevron-forward" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#8E2DE2" />
              <Text style={styles.rowText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]}>
              <Ionicons name="document-text-outline" size={22} color="#8E2DE2" />
              <Text style={styles.rowText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={deleting}>
            {deleting ? <ActivityIndicator color="#ff4444" /> : (
              <>
                <Ionicons name="trash-outline" size={22} color="#ff4444" />
                <Text style={styles.deleteText}>Delete Account</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 20 },
  sectionTitle: { color: '#8E2DE2', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 10, marginLeft: 5 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowText: { flex: 1, color: '#fff', fontSize: 16, marginLeft: 15 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,68,68,0.1)', padding: 15, borderRadius: 15, marginTop: 10 },
  deleteText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }
});
