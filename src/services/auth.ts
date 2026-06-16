// src/services/auth.ts
// Supabase anonymous + email auth with session persistence

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = 'https://jaqyrnbfthkxkddegzse.supabase.co';
// Replace with your actual anon key from Supabase dashboard
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Auth and API calls will fail. ' +
    'Set it in EAS env vars or .env for local dev.'
  );
}

// Fallback placeholder prevents createClient from throwing synchronously
// at import time when the key is missing (which crashes the app on launch
// before any try/catch can run).
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY || 'placeholder-key-app-will-not-authenticate',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// ── Anonymous sign-in (no account needed) ────────────────
export async function signInAnonymously(): Promise<void> {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (data.session) {
    await AsyncStorage.setItem('oto_access_token', data.session.access_token);
  }
}

// ── Email sign-in ────────────────────────────────────────
export async function signInWithEmail(
  email: string,
  password: string
): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (data.session) {
    await AsyncStorage.setItem('oto_access_token', data.session.access_token);
    await AsyncStorage.setItem('oto_user_email', email);
    await AsyncStorage.setItem('oto_logged_in', 'true');
  }
}

// ── Sign up ───────────────────────────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.session) {
    await AsyncStorage.setItem('oto_access_token', data.session.access_token);
    await AsyncStorage.setItem('oto_user_email', email);
    await AsyncStorage.setItem('oto_logged_in', 'true');
  }
}

// ── Sign out ──────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  await AsyncStorage.multiRemove([
    'oto_access_token',
    'oto_user_email',
    'oto_logged_in',
  ]);
}

// ── Get current session (auto-refreshes token) ───────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await AsyncStorage.setItem('oto_access_token', session.access_token);
  }
  return session;
}

// ── Check auth state ──────────────────────────────────────
export async function isLoggedIn(): Promise<boolean> {
  return (await AsyncStorage.getItem('oto_logged_in')) === 'true';
}