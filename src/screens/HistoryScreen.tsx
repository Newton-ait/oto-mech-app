// src/screens/HistoryScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../store';

type Filter = 'all' | 'critical' | 'warning' | 'healthy';

const SEV_ICONS: Record<string, string> = { critical: '🚨', warning: '⚠️', healthy: '✅' };
const SEV_BG: Record<string, string> = { critical: '#fee2e2', warning: '#fef3c7', healthy: '#dcfce7' };

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { isLoggedIn, setCurrentDiagnosis } = useStore();
  const [history, setHistory] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [showStats, setShowStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadHistory(); }, []));

  async function loadHistory() {
    try {
      const raw = await AsyncStorage.getItem('oto_history');
      setHistory(raw ? JSON.parse(raw) : []);
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }

  const filtered = filter === 'all' ? history : history.filter(h => h.severity === filter);

  // Stats
  const total = history.length;
  const avgConf = total
    ? Math.round((history.reduce((s, h) => s + (h.confidence || 0), 0) / total) * 100) + '%'
    : '—';
  const faultCounts: Record<string, number> = {};
  history.forEach(h => { faultCounts[h.top_class || 'unknown'] = (faultCounts[h.top_class || 'unknown'] || 0) + 1; });
  const topFault = Object.entries(faultCounts).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, ' ') || '—';

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: '🚨 Critical' },
    { key: 'warning', label: '⚠️ Warning' },
    { key: 'healthy', label: '✅ Healthy' },
  ];

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.title}>📋 History</Text>
        <TouchableOpacity style={s.statsBtn} onPress={() => setShowStats(!showStats)}>
          <Text style={s.statsBtnTxt}>{showStats ? '✕ Close' : '📊 Stats'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats panel */}
      {showStats && (
        <View style={s.statsPanel}>
          <View style={s.statsGrid}>
            <View style={s.statTile}>
              <Text style={s.statNum}>{total}</Text>
              <Text style={s.statLbl}>Total diagnoses</Text>
            </View>
            <View style={s.statTile}>
              <Text style={s.statNum}>{avgConf}</Text>
              <Text style={s.statLbl}>Avg confidence</Text>
            </View>
            <View style={[s.statTile, s.statWide]}>
              <Text style={s.statNum} numberOfLines={1}>{topFault}</Text>
              <Text style={s.statLbl}>Most common fault</Text>
            </View>
          </View>
        </View>
      )}

      {/* Upgrade banner */}
      {!isLoggedIn && (
        <TouchableOpacity style={s.upgradeBanner} onPress={() => navigation.navigate('Login')}>
          <Text style={s.upgradeTxt}>☁️ Sign up to sync history — <Text style={s.upgradeLink}>free →</Text></Text>
        </TouchableOpacity>
      )}

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterTab, filter === f.key && s.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterTxt, filter === f.key && s.filterTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.id || i.toString()}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎤</Text>
            <Text style={s.emptyTxt}>No diagnoses yet</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Record')}>
              <Text style={s.emptyBtnTxt}>Record your first sound →</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const conf = Math.round((item.confidence || 0) * 100);
          const label = (item.top_class || 'unknown')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
          const date = new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          });
          const feedback = item.was_correct === true ? ' · ✓' : item.was_correct === false ? ' · ✗' : '';

          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => {
                setCurrentDiagnosis(item);
                navigation.navigate('Results');
              }}
            >
              <View style={[s.sevBox, { backgroundColor: SEV_BG[item.severity] || '#f4f5f7' }]}>
                <Text style={s.sevIcon}>{SEV_ICONS[item.severity] || '🔊'}</Text>
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardLabel}>{label}</Text>
                <Text style={s.cardMeta}>{date}{feedback}</Text>
              </View>
              <Text style={s.cardConf}>{conf}%</Text>
            </TouchableOpacity>
          );
        }}
      />
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
  title: { fontSize: 18, fontWeight: '800', color: '#0d1117' },
  statsBtn: {
    backgroundColor: '#f4f5f7', borderWidth: 1, borderColor: '#e8ecf0',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  statsBtnTxt: { fontSize: 12, fontWeight: '600', color: '#5b6880' },
  statsPanel: {
    backgroundColor: '#f4f5f7', borderBottomWidth: 1, borderBottomColor: '#e8ecf0', padding: 12,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#e8ecf0', minWidth: '45%',
  },
  statWide: { flexBasis: '100%' },
  statNum: { fontSize: 22, fontWeight: '900', color: '#ff6b00', marginBottom: 2 },
  statLbl: { fontSize: 10, color: '#9aa3b0', fontWeight: '600', textTransform: 'uppercase' },
  upgradeBanner: {
    backgroundColor: '#fff8f0', borderBottomWidth: 1, borderBottomColor: '#ffe4c4',
    padding: 10, alignItems: 'center',
  },
  upgradeTxt: { fontSize: 13, color: '#92400e' },
  upgradeLink: { color: '#ff6b00', fontWeight: '700' },
  filterRow: {
    flexDirection: 'row', gap: 6, padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#e8ecf0', backgroundColor: '#fff',
  },
  filterTab: {
    backgroundColor: '#f4f5f7', borderWidth: 1.5, borderColor: '#e8ecf0',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  filterTabActive: { backgroundColor: '#ff6b00', borderColor: '#ff6b00' },
  filterTxt: { fontSize: 12, fontWeight: '600', color: '#5b6880' },
  filterTxtActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#e8ecf0',
  },
  sevBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sevIcon: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: '#0d1117' },
  cardMeta: { fontSize: 12, color: '#9aa3b0', marginTop: 2 },
  cardConf: { fontSize: 14, fontWeight: '700', color: '#ff6b00' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyTxt: { fontSize: 15, color: '#9aa3b0' },
  emptyBtn: {
    backgroundColor: '#ff6b00', borderRadius: 40, paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
