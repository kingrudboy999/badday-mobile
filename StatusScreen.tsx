import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from './supabase';

export default function StatusScreen({ navigation }: any) {
  const [groupedStatuses, setGroupedStatuses] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myLatestStatus, setMyLatestStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { fetchData(); });
    return unsubscribe;
  }, [navigation]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 1. Fetch my profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setMyProfile(profile);

      // 2. Fetch my own latest statuses (to show the segmented ring at the top)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: myStatuses } = await supabase
        .from('statuses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false });

      if (myStatuses && myStatuses.length > 0) {
        setMyLatestStatus({ user: profile, user_id: user.id, statuses: myStatuses });
      } else {
        setMyLatestStatus(null);
      }

      // 3. Fetch OTHER users' statuses (Recent Updates)
      const { data: otherStatuses } = await supabase
        .from('statuses')
        .select('*, profiles(username, avatar_url)')
        .neq('user_id', user.id) // EXCLUDE MY OWN ID
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false });

      if (otherStatuses) {
        const grouped = otherStatuses.reduce((acc: any, status: any) => {
          const uid = status.user_id;
          if (!acc[uid]) acc[uid] = { user: status.profiles, user_id: uid, statuses: [] };
          acc[uid].statuses.push(status);
          return acc;
        }, {});
        setGroupedStatuses(Object.values(grouped));
      }
    }
    setLoading(false);
  };

  const handleAddStatus = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) {
      navigation.navigate('EditStatus', { selectedMedia: result.assets });
    }
  };

  const MyStatusRing = ({ statusCount }: { statusCount: number }) => {
    if (statusCount === 0) return <View style={styles.myAvatarBorder} />;
    return (
      <Svg width={72} height={72} style={{ position: 'absolute' }}>
        <Circle cx={36} cy={36} r={34} stroke="rgba(255,255,255,0.1)" strokeWidth={3} fill="none" />
        {Array.from({ length: statusCount }).map((_, index) => {
          const circumference = 2 * Math.PI * 34;
          const segment = circumference / statusCount;
          const gap = 4;
          return <Circle key={index} cx={36} cy={36} r={34} stroke="#8E2DE2" strokeWidth={3} fill="none" strokeDasharray={`${segment - gap} ${circumference - segment + gap}`} rotation={(360 / statusCount) * index - 90} origin="36, 36" />;
        })}
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#16112B', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <BlurView intensity={60} tint="dark" style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Status</Text>
            <TouchableOpacity style={{ padding: 5 }}><Ionicons name="ellipsis-vertical" size={24} color="#fff" /></TouchableOpacity>
          </View>
        </BlurView>

        {loading ? <ActivityIndicator size="large" color="#8E2DE2" style={{ marginTop: 50 }} /> : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.myStatusRow}>
              <TouchableOpacity 
                style={styles.myAvatarContainer} 
                onPress={() => myLatestStatus ? navigation.navigate('ViewStatus', { group: myLatestStatus, isMine: true }) : handleAddStatus()}
              >
                <MyStatusRing statusCount={myLatestStatus ? myLatestStatus.statuses.length : 0} />
                {myProfile?.avatar_url ? (
                  <Image source={{ uri: myProfile.avatar_url }} style={styles.myAvatar} />
                ) : (
                  <View style={[styles.myAvatar, { backgroundColor: '#302b63', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>{myProfile?.username?.charAt(0) || 'U'}</Text>
                  </View>
                )}
                <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.addBadge}>
                  <Ionicons name="add" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.statusInfo}>
                <Text style={styles.statusName}>My Status</Text>
                <Text style={styles.statusSub}>{myLatestStatus ? 'Tap to view your status' : 'Tap to add status update'}</Text>
              </View>
              
              <TouchableOpacity onPress={handleAddStatus} style={styles.cameraBtn}>
                <Ionicons name="camera" size={24} color="#8E2DE2" />
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent updates</Text></View>

            {groupedStatuses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="aperture-outline" size={50} color="#555" />
                <Text style={styles.emptyText}>No recent updates from your contacts.</Text>
              </View>
            ) : (
              groupedStatuses.map((group: any) => (
                <TouchableOpacity key={group.user_id} style={styles.statusItem} onPress={() => navigation.navigate('ViewStatus', { group, isMine: false })}>
                  <View style={styles.ringContainer}>
                    <Svg width={68} height={68}>
                      <Circle cx={34} cy={34} r={32} stroke="rgba(255,255,255,0.1)" strokeWidth={3} fill="none" />
                      {group.statuses.map((_: any, index: number) => {
                        const circumference = 2 * Math.PI * 32;
                        const segment = circumference / group.statuses.length;
                        const gap = 4;
                        return <Circle key={index} cx={34} cy={34} r={32} stroke="#8E2DE2" strokeWidth={3} fill="none" strokeDasharray={`${segment - gap} ${circumference - segment + gap}`} rotation={(360 / group.statuses.length) * index - 90} origin="34, 34" />;
                      })}
                    </Svg>
                    <View style={styles.ringInner}>
                      {group.user?.avatar_url ? <Image source={{ uri: group.user.avatar_url }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: '#302b63', justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>{group.user?.username?.charAt(0) || 'U'}</Text></View>}
                    </View>
                  </View>
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusName}>{group.user?.username || 'BADDAY User'}</Text>
                    <Text style={styles.statusSub}>{new Date(group.statuses[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
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
  scrollContent: { paddingBottom: 40 },
  myStatusRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  myAvatarContainer: { position: 'relative', width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },
  myAvatarBorder: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  myAvatar: { width: 58, height: 58, borderRadius: 29 },
  addBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#09090E' },
  statusInfo: { flex: 1, marginLeft: 15 },
  statusName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  statusSub: { color: '#888', fontSize: 13, marginTop: 3 },
  cameraBtn: { padding: 10, backgroundColor: 'rgba(142,45,226,0.1)', borderRadius: 20 },
  sectionHeader: { paddingHorizontal: 20, paddingVertical: 10 },
  sectionTitle: { color: '#8E2DE2', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  statusItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  ringContainer: { width: 68, height: 68, justifyContent: 'center', alignItems: 'center' },
  ringInner: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: '#09090E', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#666', fontSize: 14, marginTop: 10 },
});
