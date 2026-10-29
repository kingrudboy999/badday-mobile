import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Show notifications while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushToken() {
  try {
    // Simulators cannot receive push tokens
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    // 1. Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    // 2. Android needs a notification channel (Safely skipped in Expo Go)
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8E2DE2',
        });
      } catch (channelError) {
        console.log('Notification channel skipped (Expo Go limitation)');
      }
    }

    // 3. Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    // 4. Save it to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('push_tokens').upsert({
        token,
        user_id: user.id,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Silently ignore push token errors in Expo Go so the app doesn't crash
    console.log('Push token registration skipped (Expo Go limitation):', error);
  }
}
