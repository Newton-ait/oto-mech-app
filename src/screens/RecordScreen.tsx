// src/screens/RecordScreen.tsx

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRecording } from '../hooks/useRecording';
import { useStore } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UPGRADE_THRESHOLD = 3;

export default function RecordScreen() {
  const navigation = useNavigation<any>();
  const { status, progress, elapsed, startRecording, stopRecording, reset } = useRecording();
  const { currentDiagnosis, diagCount, isLoggedIn } = useStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [history, setHistory] = React.useState<any[]>([]);

  // Load local history
  useEffect(() => {
    loadHistory();
  }, [currentDiagnosis]);

  // Navigate to results when done
  useEffect(() => {
    if (status === 'done' && currentDiagnosis) {
      setTimeout(() => navigation.navigate('Results'), 600);
    }
  }, [status, currentDiagnosis]);

  // Pulse animation while recording
  useEffect(() => {
    if (status === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  async function loadHistory() {
    try {
      const raw = await AsyncStorage.getItem('oto_history');
      if (raw) setHistory(JSON.parse(raw).slice(0, 3));
    } catch {}
  }

  async function saveToHistory(diag: any) {
    try {
      const raw = await AsyncStorage.getItem('oto_history');
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [diag, ...existing].slice(0, 50);
      await AsyncStorage.setItem('oto_history', JSON.stringify(updated));
    } catch {}
  }

  async function handleMicPress() {
    if (status === 'recording') {
      stopRecording();
      return;
    }
    if (status === 'processing') return;
    reset();
    const ok = await startRecording();
    if (!ok) {
      Alert.alert(
        'Microphone needed',
        'OTO-Mech needs microphone access to record your car sound.',
        [{ text: 'OK' }]
      );
    }
  }

  const micLabel = {
    idle: 'Tap to record · 3 seconds',
    recording: 'Recording… tap to stop',
    processing: '🧠 AI analyzing sound…',
    done: '✅ Analysis complete!',
    error: '⚠️ Try again',
  }[status];

  const showUpgradeBanner = !isLoggedIn && diagCount >= UPGRADE_THRESHOLD;
  const severityColors: Record<string, string> = {
    critical: '#dc2626', warning: '#d97706', healthy: '#16a34a',
  };

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.wordmark}>🔧 OTO-MECH</Text>
        <TouchableOpacity
          style={s.anonBadge}
          onPress={() => !isLoggedIn && navigation.navigate('Login')}
        >
          <Text style={[s.anonTxt, isLoggedIn && { color: '#ff6b00' }]}>
            {isLoggedIn ? '✓ signed in' : 'anonymous'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upgrade banner */}
      {showUpgradeBanner && (
        <TouchableOpacity style={s.upgradeBanner} onPress={() => navigation.navigate('Login')}>
          <Text style={s.upgradeTxt}>💾 Save diagnoses — <Text style={s.upgradeLink}>Sign up free →</Text></Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Record card */}
        <View style={s.recordCard}>
          <Text style={s.hint}>Hold phone near engine or exhaust</Text>

          {/* Mic button */}
          <View style={s.micOuter}>
            <Animated.View style={[s.micRing, { transform: [{ scale: pulseAnim }], opacity: status === 'recording' ? 0.4 : 0 }]} />
            <TouchableOpacity
              style={[s.micBtn, status === 'recording' && s.micBtnRecording]}
              onPress={handleMicPress}
              activeOpacity={0.85}
              disabled={status === 'processing'}
            >
              <Text style={s.micIcon}>
                {status === 'recording' ? '⏺️' : status === 'processing' ? '⏳' : '🎤'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          {status === 'recording' && (
            <View style={s.progressWrap}>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={s.progressLabel}>{((3000 - elapsed) / 1000).toFixed(1)}s</Text>
            </View>
          )}

          <Text style={s.micStatus}>{micLabel}</Text>
        </View>

        {/* Recent diagnoses */}
        <View style={s.recentSection}>
          <View style={s.recentHeader}>
            <Text style={s.sectionLabel}>RECENT</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={s.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {history.length === 0 ? (
            <Text style={s.emptyTxt}>No diagnoses yet. Record your first sound above.</Text>
          ) : (
            history.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={s.recentItem}
                onPress={() => {
                  useStore.getState().setCurrentDiagnosis(item);
                  navigation.navigate('Results');
                }}
              >
                <View style={[s.dot, { backgroundColor: severityColors[item.severity] || '#9aa3b0' }]} />
                <View style={s.recentInfo}>
                  <Text style={s.recentLabel}>
                    {(item.top_class || '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Text>
                  <Text style={s.recentDate}>
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={s.recentConf}>{Math.round((item.confidence || 0) * 100)}%</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8ecf0',
  },
  wordmark: { fontSize: 16, fontWeight: '900', color: '#ff6b00' },
  anonBadge: {
    backgroundColor: '#f4f5f7', borderWidth: 1, borderColor: '#e8ecf0',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  anonTxt: { fontSize: 11, color: '#9aa3b0', fontWeight: '600' },
  upgradeBanner: {
    backgroundColor: '#fff8f0', borderBottomWidth: 1, borderBottomColor: '#ffe4c4',
    padding: 10, alignItems: 'center',
  },
  upgradeTxt: { fontSize: 13, color: '#92400e' },
  upgradeLink: { color: '#ff6b00', fontWeight: '700' },
  scroll: { padding: 16, gap: 20 },
  recordCard: {
    backgroundColor: '#fff', borderRadius: 24,
    padding: 28, alignItems: 'center', gap: 16,
    borderWidth: 1.5, borderColor: '#e8ecf0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  hint: { fontSize: 13, color: '#5b6880', fontWeight: '500' },
  micOuter: {
    width: 140, height: 140, alignItems: 'center', justifyContent: 'center',
  },
  micRing: {
    position: 'absolute', width: 130, height: 130,
    borderRadius: 65, borderWidth: 2, borderColor: '#dc2626',
  },
  micBtn: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#ff6b00', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#ff6b00', shadowOpacity: 0.35, shadowRadius: 16, elevation: 6,
  },
  micBtnRecording: { backgroundColor: '#dc2626' },
  micIcon: { fontSize: 40 },
  progressWrap: { width: '100%', alignItems: 'center', gap: 6 },
  progressBg: {
    width: '100%', height: 6, backgroundColor: '#e8ecf0',
    borderRadius: 10, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#dc2626', borderRadius: 10,
  },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  micStatus: { fontSize: 13, color: '#9aa3b0', fontWeight: '500' },
  recentSection: { gap: 10 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9aa3b0', letterSpacing: 0.8 },
  seeAll: { fontSize: 12, color: '#ff6b00', fontWeight: '600' },
  emptyTxt: { color: '#9aa3b0', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  recentItem: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e8ecf0',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  recentInfo: { flex: 1 },
  recentLabel: { fontSize: 14, fontWeight: '600', color: '#0d1117' },
  recentDate: { fontSize: 11, color: '#9aa3b0', marginTop: 2 },
  recentConf: { fontSize: 13, fontWeight: '700', color: '#ff6b00' },
});
