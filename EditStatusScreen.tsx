import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, Image, TextInput, KeyboardAvoidingView, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export default function EditStatusScreen({ route, navigation }: any) {
  const { selectedMedia } = route.params;
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Loop through all selected media (allows multiple photos in one status)
      for (const media of selectedMedia) {
        const isVideo = media.type === 'video';
        const ext = isVideo ? 'mp4' : 'jpg';
        const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
        
        const fileName = `${user.id}-${Date.now()}-${Math.random()}.${ext}`;
        const base64 = await FileSystem.readAsStringAsync(media.uri, { encoding: FileSystem.EncodingType.Base64 });
        const arrayBuffer = decode(base64);

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
          .from('statuses')
          .upload(fileName, arrayBuffer, { contentType });
        
        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage.from('statuses').getPublicUrl(fileName);

        // Save to Database
        await supabase.from('statuses').insert({
          user_id: user.id,
          type: isVideo ? 'video' : 'image',
          media_url: publicUrl,
          content: caption // Attach the caption to every media item
        });
      }
      
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={30} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Preview</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.mediaContainer}>
          <Image source={{ uri: selectedMedia[0].uri }} style={styles.previewImage} resizeMode="contain" />
          
          {/* Caption Overlay */}
          <View style={styles.captionOverlay}>
            <Text style={styles.captionText}>{caption}</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputWrapper}>
          <BlurView intensity={80} tint="dark" style={styles.glassInputWrapper}>
            <View style={styles.inputRow}>
              <Ionicons name="text" size={24} color="#aaa" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Add a caption..."
                placeholderTextColor="#888"
                value={caption}
                onChangeText={setCaption}
                autoFocus
              />
            </View>
            <TouchableOpacity onPress={handleUpload} disabled={uploading}>
              <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.sendButton}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={24} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  mediaContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  captionOverlay: { position: 'absolute', bottom: 40, width: '90%', alignItems: 'center' },
  captionText: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },

  inputWrapper: { padding: 15 },
  glassInputWrapper: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  inputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 10 },
  sendButton: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' }
});
