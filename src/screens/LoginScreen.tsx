// src/screens/LoginScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import crashlytics from '@react-native-firebase/crashlytics';
import { signInWithEmail, signUpWithEmail } from '../services/auth';
import { useStore } from '../store';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { setLoggedIn } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      setLoggedIn(true, email);
      navigation.goBack();
    } catch (err: any) {
      crashlytics().recordError(err);
      
      Alert.alert('Error', err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={s.closeTxt}>✕</Text>
      </TouchableOpacity>

      <Text style={s.wordmark}>🔧 OTO-MECH</Text>
      <Text style={s.title}>{isSignUp ? 'Create account' : 'Welcome back'}</Text>
      <Text style={s.sub}>
        {isSignUp ? 'Sync diagnoses across devices' : 'Sign in to access your history'}
      </Text>

      <View style={s.form}>
        <Text style={s.label}>EMAIL</Text>
        <TextInput
          style={s.input}
          placeholder="you@example.com"
          placeholderTextColor="#9aa3b0"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={s.label}>PASSWORD</Text>
        <TextInput
          style={s.input}
          placeholder="••••••••"
          placeholderTextColor="#9aa3b0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={s.btnPrimary} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={s.switchTxt}>
            {isSignUp ? 'Already have an account? Sign in →' : "Don't have an account? Sign up →"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.anonTxt}>Continue anonymously</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#ffffff', padding: 24,
  },
  closeBtn: {
    alignSelf: 'flex-end', padding: 8,
    backgroundColor: '#f4f5f7', borderRadius: 20, marginBottom: 24,
  },
  closeTxt: { fontSize: 16, color: '#5b6880' },
  wordmark: { fontSize: 16, fontWeight: '900', color: '#ff6b00', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#0d1117', letterSpacing: -0.5 },
  sub: { fontSize: 14, color: '#5b6880', marginTop: 4, marginBottom: 32 },
  form: { gap: 12 },
  label: {
    fontSize: 11, fontWeight: '700', color: '#9aa3b0',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e8ecf0',
    borderRadius: 14, padding: 14, fontSize: 15, color: '#0d1117',
    marginBottom: 4,
  },
  btnPrimary: {
    backgroundColor: '#ff6b00', borderRadius: 40,
    padding: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#ff6b00', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  switchTxt: {
    color: '#ff6b00', fontWeight: '600', fontSize: 14,
    textAlign: 'center', marginTop: 16,
  },
  anonTxt: {
    color: '#9aa3b0', fontSize: 13,
    textAlign: 'center', marginTop: 12,
  },
});
