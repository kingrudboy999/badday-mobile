import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Platform, SafeAreaView, FlatList, KeyboardAvoidingView, ActivityIndicator, Alert, Image, Modal, Animated, PanResponder, Keyboard } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import EmojiPicker from '@softwhere-uz/react-native-emoji-keyboard';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { AudioRecorder, useAudioPlayer, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
import { supabase } from './supabase';
import { encryptMessage, decryptMessage } from './crypto';
import TypingIndicator from './TypingIndicator';

const PAGE_SIZE = 20;
const REACTIONS = ['❤️', '😂', '👍', '😮', '😢'];

const SwipeableMessage = ({ msg, isMe, children, onReply, onLongPress }) => {
  const pan = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current; 

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dx > 10 && Math.abs(gestureState.dy) < 15,
      onPanResponderMove: Animated.event([null, { dx: pan }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 60) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
          onReply(msg);
        }
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  const translateX = pan.interpolate({ inputRange: [0, 100], outputRange: [0, 60], extrapolate: 'clamp' });

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], opacity: scaleAnim }, styles.messageRow, isMe && styles.userRow]}>
      {isMe && <View style={styles.replyIconContainer}><Ionicons name="arrow-undo" size={18} color="#8E2DE2" /></View>}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity activeOpacity={0.8} onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLongPress(msg); }}>
          <View style={isMe ? styles.userBubbleWrapper : styles.aiBubbleWrapper}>
            <BlurView intensity={isMe ? 50 : 30} tint={isMe ? 'dark' : 'light'} style={styles.bubbleBlur}>
              {children}
            </BlurView>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, name, avatar_url, isGroup, isAI, otherUserId } = route.params; 
  const [messages, setMessages] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [receiverPublicKey, setReceiverPublicKey] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [reactingTo, setReactingTo] = useState<any>(null); 
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<AudioRecorder | null>(null); 
  const player = useAudioPlayer(null); 
  
  const channelRef = useRef<any>(null);
  const typingTimeout = useRef<any>(null);

  useEffect(() => {
    setupChat();
    const channel = supabase.channel(`chat_${chatId}`);
    
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, 
      async (payload) => {
        const msg = payload.new;
        if (msg.sender_id !== userId && msg.public_key && msg.nonce) {
           msg.content = await decryptMessage(msg.content, msg.nonce, msg.public_key);
        }
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [msg, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (payload) => {
        setReactions(prev => [...prev, payload.new]);
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== userId) {
          setIsOtherTyping(true);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setIsOtherTyping(false), 2000);
        }
      })
      .subscribe();
      
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); if (typingTimeout.current) clearTimeout(typingTimeout.current); };
  }, [chatId, userId]);

  const setupChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      if (otherUserId) {
        const { data: profile } = await supabase.from('profiles').select('public_key').eq('id', otherUserId).single();
        if (profile?.public_key) setReceiverPublicKey(profile.public_key);
      }
      
      const { data, error } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: false }).limit(PAGE_SIZE);
      if (error) throw error;
      if (data) {
        const decryptedMessages = await Promise.all(data.map(async (msg: any) => {
          if (msg.sender_id !== user?.id && msg.public_key && msg.nonce) msg.content = await decryptMessage(msg.content, msg.nonce, msg.public_key);
          return msg;
        }));
        setMessages(decryptedMessages);
        
        const msgIds = decryptedMessages.map(m => m.id);
        const { data: rData } = await supabase.from('message_reactions').select('*').in('message_id', msgIds);
        if (rData) setReactions(rData);
      }
      
      if (user) await supabase.from('messages').update({ status: 'read' }).eq('chat_id', chatId).neq('sender_id', user.id).neq('status', 'read');
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (channelRef.current && userId) {
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId } });
    }
  };

  const sendMessage = async () => {
    const cleanText = inputText.trim();
    if (cleanText === '' || !userId || cleanText.length > 4000) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const plainText = cleanText;
    setInputText(''); setIsEmojiPickerOpen(false);
    const replyId = replyingTo ? replyingTo.id : null;
    setReplyingTo(null);

    try {
      let finalContent = plainText; let nonce = null; let myPublicKey = null;
      if (!isGroup && receiverPublicKey) {
        const encrypted = await encryptMessage(plainText, receiverPublicKey);
        finalContent = encrypted.ciphertext; nonce = encrypted.nonce;
        const { data: myProfile } = await supabase.from('profiles').select('public_key').eq('id', userId).single();
        myPublicKey = myProfile?.public_key;
      }
      await supabase.from('messages').insert({ chat_id: chatId, sender_id: userId, content: finalContent, nonce, public_key: myPublicKey, type: 'text', status: 'sent', reply_to_id: replyId });
    } catch (err: any) { Alert.alert("Encryption Error", err.message); setInputText(plainText); }
  };

  const uploadFile = async (uri: string, type: 'image' | 'video' | 'audio' | 'document', viewOnce: boolean = false) => {
    if (!userId) return;
    setShowAttachMenu(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let finalUri = uri;
      let contentType = 'application/octet-stream';
      let ext = 'file';

      if (type === 'image') {
        const manipResult = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1080 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
        finalUri = manipResult.uri;
        contentType = 'image/jpeg'; ext = 'jpg';
      } else if (type === 'video') { contentType = 'video/mp4'; ext = 'mp4'; }
      else if (type === 'audio') { contentType = 'audio/m4a'; ext = 'm4a'; }

      const fileName = `${userId}-${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(finalUri, { encoding: FileSystem.EncodingType.Base64 });
      const arrayBuffer = decode(base64);

      const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, arrayBuffer, { contentType });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);

      await supabase.from('messages').insert({
        chat_id: chatId, sender_id: userId,
        content: type === 'audio' ? '🎤 Voice Note' : type === 'image' ? '📷 Photo' : type === 'video' ? '🎥 Video' : '📄 Document',
        type, media_url: publicUrl, status: 'sent', view_once: viewOnce, reply_to_id: replyingTo?.id || null
      });
      setReplyingTo(null);
    } catch (error: any) { Alert.alert("Upload Failed", error.message); } 
  };

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return Alert.alert("Permission needed", "Please grant microphone access.");
      player.pause();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      
      const freshRecorder = new AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await freshRecorder.prepareToRecordAsync();
      await new Promise(res => setTimeout(res, 150));
      freshRecorder.record();
      
      setRecorder(freshRecorder); setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err: any) { Alert.alert("Error", "Could not start recording: " + (err.message || "Unknown error")); }
  };

  const stopRecording = async () => {
    if (!isRecording || !recorder) return;
    setIsRecording(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recorder.stop(); 
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri; 
      recorder.release(); 
      if (uri) uploadFile(uri, 'audio');
    } catch (error) { console.error(error); } finally { setRecorder(null); }
  };

  const playAudio = (uri: string) => { player.replace(uri); player.play(); };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReactingTo(null);

    const existing = reactions.find(r => r.message_id === msgId && r.user_id === userId);
    if (existing) {
      if (existing.emoji === emoji) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
        setReactions(prev => prev.filter(r => r.id !== existing.id));
      } else {
        await supabase.from('message_reactions').update({ emoji }).eq('id', existing.id);
        setReactions(prev => prev.map(r => r.id === existing.id ? { ...r, emoji } : r));
      }
    } else {
      const { data } = await supabase.from('message_reactions').insert({ message_id: msgId, user_id: userId, emoji }).select().single();
      if (data) setReactions(prev => [...prev, data]);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#09090E', '#1A0B2E', '#09090E']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        
        <BlurView intensity={60} tint="dark" style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5, marginRight: 5 }}><Ionicons name="chevron-back" size={28} color="#fff" /></TouchableOpacity>
            <TouchableOpacity onPress={() => !isGroup && otherUserId && navigation.navigate("UserProfile", { userId: otherUserId })}>
              {avatar_url ? <Image source={{ uri: avatar_url }} style={styles.headerAvatarImage} /> : (
                <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.headerAvatar}><Ionicons name={isGroup ? "people" : isAI ? "skull" : "person"} size={20} color="#fff" /></LinearGradient>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{name}</Text>
              {isOtherTyping ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={[styles.headerStatus, { color: '#8E2DE2' }]}>typing</Text><TypingIndicator /></View>
              ) : (
                <Text style={styles.headerStatus}>End-to-End Encrypted</Text>
              )}
            </View>
          </View>
        </BlurView>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {loading ? <ActivityIndicator size="large" color="#8E2DE2" style={{ marginTop: 50 }} /> : (
            <FlatList
              inverted
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatContainer}
              renderItem={({ item: msg }) => {
                const isMe = msg.sender_id === userId;
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const msgReactions = reactions.filter(r => r.message_id === msg.id);
                const uniqueReactions = [...new Set(msgReactions.map(r => r.emoji))];
                
                return (
                  <SwipeableMessage msg={msg} isMe={isMe} onReply={setReplyingTo} onLongPress={setReactingTo}>
                    {isMe ? (
                      <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.bubbleGradient}>
                        {msg.type === 'text' && <Text style={styles.userText}>{msg.content}</Text>}
                        {msg.type === 'image' && <Image source={{ uri: msg.media_url }} style={styles.mediaImage} />}
                        {msg.type === 'audio' && (
                          <TouchableOpacity onPress={() => playAudio(msg.media_url)} style={styles.audioBubble}>
                            <Ionicons name="play-circle" size={30} color="#fff" />
                            <View style={styles.waveform}>
                               <View style={[styles.waveBar, { height: 10 }]} />
                               <View style={[styles.waveBar, { height: 18 }]} />
                               <View style={[styles.waveBar, { height: 12 }]} />
                               <View style={[styles.waveBar, { height: 22 }]} />
                               <View style={[styles.waveBar, { height: 8 }]} />
                               <View style={[styles.waveBar, { height: 16 }]} />
                            </View>
                          </TouchableOpacity>
                        )}
                        <View style={styles.metaRow}><Text style={styles.timeText}>{time}</Text><Ionicons name="checkmark-done" size={14} color={msg.status === 'read' ? "#00FF88" : "rgba(255,255,255,0.4)"} style={{ marginLeft: 4 }} /></View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.aiBubbleInner}>
                         {msg.type === 'text' && <Text style={styles.aiText}>{msg.content}</Text>}
                         {msg.type === 'image' && <Image source={{ uri: msg.media_url }} style={styles.mediaImage} />}
                         {msg.type === 'audio' && (
                           <TouchableOpacity onPress={() => playAudio(msg.media_url)} style={styles.audioBubble}>
                             <Ionicons name="play-circle" size={30} color="#8E2DE2" />
                             <View style={styles.waveform}>
                               <View style={[styles.waveBar, { height: 12, backgroundColor: '#8E2DE2' }]} />
                               <View style={[styles.waveBar, { height: 20, backgroundColor: '#8E2DE2' }]} />
                               <View style={[styles.waveBar, { height: 14, backgroundColor: '#8E2DE2' }]} />
                               <View style={[styles.waveBar, { height: 24, backgroundColor: '#8E2DE2' }]} />
                             </View>
                           </TouchableOpacity>
                         )}
                         <View style={styles.metaRow}><Text style={[styles.timeText, { color: 'rgba(255,255,255,0.6)' }]}>{time}</Text></View>
                      </View>
                    )}
                    
                    {uniqueReactions.length > 0 && (
                      <View style={[styles.reactionBadge, isMe ? { right: 10 } : { left: 10 }]}>
                        <Text style={{ fontSize: 12 }}>{uniqueReactions.join(' ')}</Text>
                        {msgReactions.length > 1 && <Text style={styles.reactionCount}>{msgReactions.length}</Text>}
                      </View>
                    )}
                  </SwipeableMessage>
                );
              }}
            />
          )}

          <BlurView intensity={80} tint="dark" style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              <TouchableOpacity 
                onPress={() => {
                  Keyboard.dismiss();
                  setIsEmojiPickerOpen(prev => !prev);
                }} 
                style={{ padding: 8 }}
              >
                <Ionicons name={isEmojiPickerOpen ? "keypad-outline" : "happy-outline"} size={24} color="#8E2DE2" />
              </TouchableOpacity>
              
              <TextInput 
                style={styles.input} 
                placeholder="Message..." 
                placeholderTextColor="#888" 
                value={inputText} 
                onChangeText={handleTyping} 
                multiline 
                maxLength={4000} 
                onFocus={() => setIsEmojiPickerOpen(false)} 
              />
              
              {inputText.trim() ? (
                <TouchableOpacity onPress={sendMessage}><LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.sendButton}><Ionicons name="arrow-up" size={20} color="#fff" /></LinearGradient></TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowAttachMenu(true)} style={{ padding: 8 }}><Ionicons name="attach" size={26} color="#888" /></TouchableOpacity>
                  <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecording} style={{ padding: 8 }}><Ionicons name="mic" size={26} color={isRecording ? '#ff4444' : '#8E2DE2'} /></TouchableOpacity>
                </>
              )}
            </View>
          </BlurView>
        </KeyboardAvoidingView>

        <Modal visible={!!reactingTo} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReactingTo(null)}>
            <BlurView intensity={80} tint="dark" style={styles.reactionPopup}>
              {REACTIONS.map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => toggleReaction(reactingTo.id, emoji)} style={{ padding: 8 }}>
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </BlurView>
          </TouchableOpacity>
        </Modal>

        <EmojiPicker 
          onEmojiSelected={(emojiObject) => setInputText((prev) => prev + emojiObject.emoji)} 
          open={isEmojiPickerOpen} 
          onClose={() => setIsEmojiPickerOpen(false)} 
          theme={{ backdrop: 'rgba(0,0,0,0.7)', knob: '#8E2DE2', container: '#16112B', header: '#16112B', skinTonesContainer: '#302b63', category: { icon: 'rgba(255,255,255,0.4)', iconActive: '#8E2DE2', container: '#09090E', containerActive: '#302b63' }, search: { text: '#fff', placeholder: '#888', icon: '#888', background: 'rgba(255,255,255,0.05)' } }} 
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090E' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  header: { paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerAvatarImage: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerStatus: { color: '#00FF88', fontSize: 10, fontWeight: '500' },
  chatContainer: { flexGrow: 1, justifyContent: 'flex-end', padding: 12, paddingBottom: 20 },
  messageRow: { marginVertical: 6, flexDirection: 'row', alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  replyIconContainer: { position: 'absolute', left: -30, bottom: 15 },
  aiBubbleWrapper: { maxWidth: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 4, overflow: 'visible', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  userBubbleWrapper: { maxWidth: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 4, overflow: 'visible', borderWidth: 1, borderColor: 'rgba(142,45,226,0.3)' },
  bubbleBlur: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  bubbleGradient: { padding: 12, paddingBottom: 8 },
  aiBubbleInner: { padding: 12, paddingBottom: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  userText: { color: '#fff', fontSize: 16, lineHeight: 22, paddingHorizontal: 2 },
  aiText: { color: '#eee', fontSize: 16, lineHeight: 22, paddingHorizontal: 2 },
  mediaImage: { width: 240, height: 240, borderRadius: 12, marginBottom: 5 },
  audioBubble: { flexDirection: 'row', alignItems: 'center', padding: 5, paddingVertical: 10 },
  waveform: { flexDirection: 'row', alignItems: 'center', width: 120, marginLeft: 12 },
  waveBar: { width: 4, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 2, marginHorizontal: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, paddingRight: 2 },
  timeText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  reactionBadge: { position: 'absolute', bottom: -12, backgroundColor: '#16112B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  reactionCount: { color: '#aaa', fontSize: 11, marginLeft: 4, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  reactionPopup: { flexDirection: 'row', padding: 10, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  inputWrapper: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingBottom: Platform.OS === 'ios' ? 25 : 10, paddingTop: 8, paddingHorizontal: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingHorizontal: 10, paddingVertical: 10, maxHeight: 100 },
  sendButton: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
});
