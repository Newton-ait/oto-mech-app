// src/screens/ResultsScreen.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { sendFeedback } from '../services/api';
import { useStore } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADVICE: Record<string, { text: string; urgency: string; urgencyClass: string }> = {
  exhaust_rattle: {
    text: 'Check exhaust heat shield and pipe clamps. Usually a loose bracket vibrating against the body. A shop can fix it for $50–$200.',
    urgency: 'Low — monitor it', urgencyClass: 'low',
  },
  suspension_creak: {
    text: 'Inspect control arm bushings, ball joints, and sway bar links. Safe short-term but get checked within 2 weeks.',
    urgency: 'Moderate — check soon', urgencyClass: 'moderate',
  },
  brake_squeal: {
    text: 'Brake pads likely worn to the indicator. Schedule inspection within 1 week. Delaying turns a $150 job into a $400+ repair.',
    urgency: 'High — inspect this week', urgencyClass: 'high',
  },
  engine_knock: {
    text: 'Serious issue. Could be rod knock or low oil pressure. Check oil immediately and do not continue driving without inspection.',
    urgency: 'Critical — stop driving', urgencyClass: 'critical',
  },
  healthy_baseline: {
    text: 'No concerning noises detected. Engine sounds healthy. Keep up with regular oil changes and scheduled maintenance.',
    urgency: 'None — all clear ✅', urgencyClass: 'low',
  },
};

const URGENCY_COLORS: Record<string, string> = {
  low: '#16a34a', moderate: '#d97706', high: '#ea580c', critical: '#dc2626',
};

const URGENCY_BG: Record<string, string> = {
  low: '#dcfce7', moderate: '#fef3c7', high: '#fff0e6', critical: '#fee2e2',
};

const SCORE_COLORS: Record<string, string> = {
  engine_knock: '#dc2626', brake_squeal: '#dc2626',
  suspension_creak: '#d97706', exhaust_rattle: '#d97706', healthy_baseline: '#16a34a',
};

export default function ResultsScreen() {
  const navigation = useNavigation<any>();
  const { currentDiagnosis } = useStore();
  const confAnim = useRef(new Animated.Value(0)).current;
  const [feedbackDone, setFeedbackDone] = useState(false);

  useEffect(() => {
    if (!currentDiagnosis) return;
    saveToHistory(currentDiagnosis);
    Animated.timing(confAnim, {
      toValue: currentDiagnosis.confidence,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [currentDiagnosis]);

  async function saveToHistory(diag: any) {
    try {
      const raw = await AsyncStorage.getItem('oto_history');
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [diag, ...existing.filter((h: any) => h.id !== diag.id)].slice(0, 50);
      await AsyncStorage.setItem('oto_history', JSON.stringify(updated));
    } catch {}
  }

  async function handleFeedback(wasCorrect: boolean) {
    if (!currentDiagnosis?.prediction_id) return;
    try {
      await sendFeedback(currentDiagnosis.prediction_id, wasCorrect);
    } catch {}
    setFeedbackDone(true);
  }

  if (!currentDiagnosis) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#9aa3b0' }}>No diagnosis available. Go back and record a sound.</Text>
      </View>
    );
  }

  const diag = currentDiagnosis;
  const conf = Math.round(diag.confidence * 100);
  const advice = ADVICE[diag.top_class] || ADVICE.healthy_baseline;
  const sorted = Object.entries(diag.scores).sort((a, b) => b[1] - a[1]);
  const icons: Record<string, string> = { critical: '🚨', warning: '⚠️', healthy: '✅' };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate('Record')}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Diagnosis</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroIcon}>{icons[diag.severity] || '🔊'}</Text>
          <Text style={s.diagLabel}>
            {diag.top_class.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </Text>
          <Text style={s.diagSub}>Detected with {conf}% confidence</Text>

          <View style={s.confTrack}>
            <Animated.View style={[
              s.confFill,
              { width: confAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]} />
          </View>
          <View style={s.confMeta}>
            <Text style={s.confEdge}>0%</Text>
            <Text style={s.confValue}>{conf}%</Text>
            <Text style={s.confEdge}>100%</Text>
          </View>
        </View>

        {/* Scores */}
        <View style={s.card}>
          <Text style={s.cardLabel}>ALL SOUND CLASSES</Text>
          {sorted.map(([label, prob]) => {
            const pct = Math.round((prob as number) * 100);
            const isTop = label === diag.top_class;
            const color = SCORE_COLORS[label] || '#94a3b8';
            return (
              <View key={label} style={s.scoreRow}>
                <Text style={[s.scoreName, isTop && s.scoreNameTop]}>
                  {label.replace(/_/g, ' ')}
                </Text>
                <View style={s.scoreBarBg}>
                  <View style={[s.scoreBarFill, { width: `${pct}%`, backgroundColor: color, opacity: isTop ? 1 : 0.4 }]} />
                </View>
                <Text style={[s.scorePct, isTop && { color }]}>{pct}%</Text>
              </View>
            );
          })}
        </View>

        {/* Advice */}
        <View style={s.adviceCard}>
          <Text style={s.adviceIcon}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.adviceTitle}>WHAT TO DO</Text>
            <Text style={s.adviceBody}>{advice.text}</Text>
          </View>
        </View>

        {/* Urgency */}
        <View style={s.urgencyRow}>
          <Text style={s.urgencyLabel}>Urgency</Text>
          <View style={[s.urgencyBadge, { backgroundColor: URGENCY_BG[advice.urgencyClass] }]}>
            <Text style={[s.urgencyTxt, { color: URGENCY_COLORS[advice.urgencyClass] }]}>
              {advice.urgency}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('Chat')}>
            <Text style={s.btnPrimaryTxt}>💬 Ask mechanic</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnOutline} onPress={() => navigation.navigate('Record')}>
            <Text style={s.btnOutlineTxt}>🎤 New recording</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback */}
        <View style={s.feedbackSection}>
          <Text style={s.feedbackPrompt}>Was this diagnosis accurate?</Text>
          {feedbackDone ? (
            <Text style={s.feedbackThanks}>✅ Thanks for your feedback!</Text>
          ) : (
            <View style={s.feedbackBtns}>
              <TouchableOpacity style={s.fbBtn} onPress={() => handleFeedback(true)}>
                <Text style={s.fbTxt}>👍 Yes, correct</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.fbBtn} onPress={() => handleFeedback(false)}>
                <Text style={s.fbTxt}>👎 Not accurate</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8ecf0',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f4f5f7', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e8ecf0',
  },
  backTxt: { fontSize: 18, color: '#0d1117' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0d1117' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'flex-start', borderWidth: 1, borderColor: '#e8ecf0',
  },
  heroIcon: { fontSize: 40, marginBottom: 8 },
  diagLabel: { fontSize: 26, fontWeight: '900', color: '#0d1117', letterSpacing: -0.5 },
  diagSub: { fontSize: 13, color: '#5b6880', marginTop: 4, marginBottom: 16 },
  confTrack: {
    width: '100%', height: 10, backgroundColor: '#e8ecf0',
    borderRadius: 10, overflow: 'hidden',
  },
  confFill: {
    height: '100%', borderRadius: 10,
    backgroundColor: '#ff6b00',
  },
  confMeta: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6,
  },
  confEdge: { fontSize: 11, color: '#9aa3b0' },
  confValue: { fontSize: 12, fontWeight: '700', color: '#ff6b00' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    gap: 10, borderWidth: 1, borderColor: '#e8ecf0',
  },
  cardLabel: { fontSize: 10, fontWeight: '700', color: '#9aa3b0', letterSpacing: 0.8, marginBottom: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreName: { width: 120, fontSize: 12, color: '#5b6880' },
  scoreNameTop: { fontWeight: '700', color: '#0d1117' },
  scoreBarBg: {
    flex: 1, height: 7, backgroundColor: '#e8ecf0', borderRadius: 10, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 10 },
  scorePct: { width: 36, fontSize: 11, fontWeight: '600', color: '#9aa3b0', textAlign: 'right' },
  adviceCard: {
    backgroundColor: '#fff8f0', borderRadius: 20, padding: 16,
    flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#ffe4c4',
  },
  adviceIcon: { fontSize: 22 },
  adviceTitle: { fontSize: 10, fontWeight: '700', color: '#9aa3b0', letterSpacing: 0.8, marginBottom: 4 },
  adviceBody: { fontSize: 13, color: '#0d1117', lineHeight: 20 },
  urgencyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  urgencyLabel: { fontSize: 13, color: '#5b6880', fontWeight: '500' },
  urgencyBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  urgencyTxt: { fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flex: 1, backgroundColor: '#ff6b00', borderRadius: 40,
    padding: 14, alignItems: 'center',
    shadowColor: '#ff6b00', shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: {
    flex: 1, borderRadius: 40, padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e8ecf0', backgroundColor: '#fff',
  },
  btnOutlineTxt: { color: '#0d1117', fontWeight: '600', fontSize: 14 },
  feedbackSection: { alignItems: 'center', gap: 10 },
  feedbackPrompt: { fontSize: 13, color: '#9aa3b0' },
  feedbackBtns: { flexDirection: 'row', gap: 10 },
  fbBtn: {
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 40, borderWidth: 1.5, borderColor: '#e8ecf0', backgroundColor: '#fff',
  },
  fbTxt: { fontSize: 13, fontWeight: '600', color: '#0d1117' },
  feedbackThanks: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
});
