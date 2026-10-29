import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Image, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width, height } = Dimensions.get('window');

export default function ViewStatusScreen({ route, navigation }: any) {
  const { group } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const currentStatus = group.statuses[currentIndex];

  const handleNext = () => {
    if (currentIndex < group.statuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPaused(false);
    } else {
      navigation.goBack();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPaused(false);
    }
  };

  // AUTOMATIC 5-SECOND TIMER FOR IMAGES
  useEffect(() => {
    if (currentStatus.type === 'image' && !isPaused) {
      const timer = setTimeout(() => {
        handleNext();
      }, 5000); // 5 seconds like WhatsApp
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isPaused, currentStatus]);

  return (
    <View style={styles.container}>
      
      {/* 1. MEDIA CONTENT (Bottom Layer) */}
      <View style={styles.mediaContainer}>
        {currentStatus.type === 'image' ? (
          <Image source={{ uri: currentStatus.media_url }} style={styles.media} resizeMode="cover" />
        ) : (
          <VideoPlayer uri={currentStatus.media_url} onEnd={handleNext} />
        )}
        {currentStatus.content ? (
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>{currentStatus.content}</Text>
          </View>
        ) : null}
      </View>

      {/* 2. TAP NAVIGATION OVERLAY (Middle Layer) */}
      <View style={styles.tapAreas}>
        {/* Left side (Previous) */}
        <TouchableOpacity 
          style={styles.tapLeft} 
          onPress={handlePrev} 
          activeOpacity={1}
          onLongPress={() => setIsPaused(true)}
          onPressOut={() => setIsPaused(false)}
        />
        {/* Right side (Next) */}
        <TouchableOpacity 
          style={styles.tapRight} 
          onPress={handleNext} 
          activeOpacity={1}
          onLongPress={() => setIsPaused(true)}
          onPressOut={() => setIsPaused(false)}
        />
      </View>

      {/* 3. UI OVERLAY - Header & Progress Bars (Top Layer) */}
      <SafeAreaView style={styles.uiOverlay} pointerEvents="box-none">
        <View style={styles.progressBarContainer} pointerEvents="none">
          {group.statuses.map((_: any, idx: number) => (
            <View 
              key={idx} 
              style={[
                styles.progressBar, 
                { backgroundColor: idx < currentIndex ? '#fff' : idx === currentIndex ? '#8E2DE2' : 'rgba(255,255,255,0.3)' }
              ]} 
            />
          ))}
        </View>
        
        <View style={styles.header} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', alignItems: 'center' }} pointerEvents="none">
            {group.user?.avatar_url ? (
              <Image source={{ uri: group.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: '#8E2DE2', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff' }}>{group.user?.username?.charAt(0)}</Text>
              </View>
            )}
            <View>
              <Text style={styles.username}>{group.user?.username}</Text>
              <Text style={styles.timeText}>
                {new Date(currentStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

    </View>
  );
}

const VideoPlayer = ({ uri, onEnd }: { uri: string, onEnd: () => void }) => {
  const player = useVideoPlayer(uri, player => {
    player.loop = false;
    player.play();
  });
  
  useEffect(() => {
    const sub = player.addListener('playToEnd', onEnd);
    return () => sub.remove();
  }, [player]);

  return <VideoView player={player} style={styles.media} contentFit="cover" />;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  // Layer 1: Media
  mediaContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', zIndex: 1 },
  media: { width: width, height: height },
  captionContainer: { position: 'absolute', bottom: 80, left: 0, right: 0, paddingHorizontal: 20, zIndex: 2 },
  captionText: { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },

  // Layer 2: Tap Areas (Transparent)
  tapAreas: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 10 },
  tapLeft: { flex: 1, height: '100%' },
  tapRight: { flex: 1, height: '100%' },

  // Layer 3: UI Overlay
  uiOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  progressBarContainer: { flexDirection: 'row', paddingHorizontal: 10, marginTop: 10, gap: 5 },
  progressBar: { flex: 1, height: 3, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  username: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  timeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }
});
