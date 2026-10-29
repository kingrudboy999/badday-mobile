import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';
import { generateKeyPair } from './crypto';

const AuthContext = createContext<{ session: Session | null; loading: boolean }>({ session: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
         // Check if device already has a private key. If not, generate one!
         const existingKey = await SecureStore.getItemAsync('e2ee_private_key');
         if (!existingKey) {
            await generateKeyPair();
         }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setLoading(false);
      if (session) {
         const existingKey = await SecureStore.getItemAsync('e2ee_private_key');
         if (!existingKey) await generateKeyPair();
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
