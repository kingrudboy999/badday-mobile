import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import ChatList from './ChatList';
import ChatScreen from './ChatScreen';
import AuthScreen from './AuthScreen';
import StatusScreen from './StatusScreen';
import CallsScreen from './CallsScreen';
import CallScreen from './CallScreen';
import ProfileScreen from './ProfileScreen';
import UserProfileScreen from './UserProfileScreen';
import NewChatScreen from './NewChatScreen';
import EditStatusScreen from './EditStatusScreen';
import ViewStatusScreen from './ViewStatusScreen';
import CreateGroupScreen from './CreateGroupScreen';
import LockScreen from './LockScreen';
import AppSettingsScreen from './AppSettingsScreen';
import ArchivedChats from './ArchivedChats';
import BlockedUsersScreen from './BlockedUsersScreen';
import { AuthProvider, useAuth } from './AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { position: 'absolute', bottom: 0, left: 0, right: 0, elevation: 0, backgroundColor: 'transparent', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', height: Platform.OS === 'ios' ? 85 : 65, paddingBottom: Platform.OS === 'ios' ? 25 : 10 },
      tabBarBackground: () => <BlurView intensity={80} tint="dark" style={{ flex: 1, backgroundColor: 'rgba(9,9,14,0.5)' }} />,
      tabBarActiveTintColor: '#8E2DE2',
      tabBarInactiveTintColor: '#888',
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: any = 'chatbubbles';
        if (route.name === 'Chats') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        else if (route.name === 'Status') iconName = focused ? 'aperture' : 'aperture-outline';
        else if (route.name === 'Calls') iconName = focused ? 'call' : 'call-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="Chats" component={ChatList} />
      <Tab.Screen name="Status" component={StatusScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const appState = React.useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        setIsLocked(true);
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  if (loading) return <View style={{ flex: 1, backgroundColor: '#09090E', justifyContent: 'center' }}><ActivityIndicator size="large" color="#8E2DE2" /></View>;

  if (isLocked && session) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session && session.user ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="ArchivedChats" component={ArchivedChats} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={AppSettingsScreen} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="NewChat" component={NewChatScreen} />
          <Stack.Screen name="EditStatus" component={EditStatusScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="ViewStatus" component={ViewStatusScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="Call" component={CallScreen} options={{ animation: 'slide_from_bottom' }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={DarkTheme}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
