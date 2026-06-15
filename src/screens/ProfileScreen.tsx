// src/screens/ProfileScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from '../services/auth';
import { useStore } from '../store';

const CAR_MAKES = [
  'Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes', 'Volkswagen',
  'Hyundai', 'Kia', 'Nissan', 'Chevrolet', 'Audi', 'Mazda',
  'Subaru', 'Jeep', 'Ram', 'Dodge', 'Lexus', 'Acura',
];

const YEARS = Array.from({ length: 35 }, (_, i) => String(new Date().getFullYear() - i));

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { isLoggedIn, userEmail, setLoggedIn, vehicle, setVehicle, groqKey, setGroqKey } = useStore();
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Load saved vehicle & prefs
    AsyncStorage.multiGet(['oto_vehicle', 'oto_dark_mode', 'oto_groq_key']).then(pairs => {
      const [vehicleRaw, darkRaw, keyRaw] = pairs.map(p => p[1]);
      if (vehicleRaw) {
        const v = JSON.parse(vehicleRaw);
        setVehicle(v);
        setMake(v.make || ''); setModel(v.model || '');
        setYear(v.year || ''); setMileage(v.mileage || '');
      }
      if (darkRaw) setDarkMode(darkRaw === 'true');
      if (keyRaw) setGroqKey(keyRaw);
    });
  }, []);

  async function handleSaveVehicle() {
    if (!make || !year || !model) {
      Alert.alert('Missing fields', 'Please fill in make, year, and model.');
      return;
    }
    const v = { make, model, year, mileage };
    setVehicle(v);
    await AsyncStorage.setItem('oto_vehicle', JSON.stringify(v));
    setEditingVehicle(false);
  }

  async function handleLogout() {
    Alert.alert('Sign out', 'Your local history stays on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await signOut();
          setLoggedIn(false);
        },
      },
    ]);
  }

  async function handleGroqKey() {
    Alert.prompt(
      'Groq API Key',
      'Get free at console.groq.com\nKeys start with "gsk_"',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (key) => {
            if (!key) return;
            if (!key.trim().startsWith('gsk_')) {
              Alert.alert('Invalid key', 'Groq keys start with "gsk_"');
              return;
            }
            setGroqKey(key.trim());
            await AsyncStorage.setItem('oto_groq_key', key.trim());
          },
        },
      ],
      'plain-text',
      groqKey || ''
    );
  }

  async function handleClearHistory() {
    Alert.alert('Clear history', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['oto_history', 'oto_diag_count']);
        },
      },
    ]);
  }

  const vehicleLabel = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : 'No vehicle added';

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.title}>🚗 Profile</Text>
      </View>

      {/* Account */}
      <View style={s.section}>
        {isLoggedIn ? (
          <View style={s.accountCard}>
            <View style={s.accountAvatar}><Text style={{ fontSize: 20 }}>🔧</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.accountName}>{userEmail?.split('@')[0] || 'User'}</Text>
              <Text style={s.accountEmail}>{userEmail}</Text>
            </View>
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
              <Text style={s.logoutTxt}>Sign out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.anonCard}>
            <View style={s.anonAvatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.anonName}>Anonymous user</Text>
              <Text style={s.anonSub}>Diagnoses saved locally</Text>
            </View>
          </View>
        )}
        {!isLoggedIn && (
          <TouchableOpacity style={s.signUpBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={s.signUpTxt}>☁️ Sign up to sync your data</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Vehicle */}
      <Text style={s.sectionTitle}>MY VEHICLE</Text>
      <View style={s.section}>
        {!editingVehicle ? (
          <View style={s.vehicleRow}>
            <Text style={s.vehicleIcon}>🚗</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.vehicleName}>{vehicleLabel}</Text>
              <Text style={s.vehicleSub}>
                {vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString()} miles` : 'Tap ✏️ to add your car'}
              </Text>
            </View>
            <TouchableOpacity style={s.editBtn} onPress={() => setEditingVehicle(true)}>
              <Text>✏️</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.vehicleForm}>
            <Text style={s.formLabel}>MAKE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {CAR_MAKES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.makeChip, make === m && s.makeChipActive]}
                    onPress={() => setMake(m)}
                  >
                    <Text style={[s.makeChipTxt, make === m && s.makeChipTxtActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.formLabel}>MODEL</Text>
            <TextInput
              style={s.input} value={model} onChangeText={setModel}
              placeholder="e.g. Camry, Civic, F-150" placeholderTextColor="#9aa3b0"
            />

            <Text style={s.formLabel}>YEAR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {YEARS.slice(0, 15).map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[s.makeChip, year === y && s.makeChipActive]}
                    onPress={() => setYear(y)}
                  >
                    <Text style={[s.makeChipTxt, year === y && s.makeChipTxtActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.formLabel}>MILEAGE (optional)</Text>
            <TextInput
              style={s.input} value={mileage} onChangeText={setMileage}
              placeholder="e.g. 85000" placeholderTextColor="#9aa3b0" keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity style={[s.signUpBtn, { flex: 1 }]} onPress={handleSaveVehicle}>
                <Text style={s.signUpTxt}>Save vehicle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.signUpBtn, { flex: 1, backgroundColor: '#f4f5f7' }]}
                onPress={() => setEditingVehicle(false)}
              >
                <Text style={[s.signUpTxt, { color: '#5b6880' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Settings */}
      <Text style={s.sectionTitle}>SETTINGS</Text>
      <View style={s.settingsList}>
        <View style={s.settingItem}>
          <Text style={s.settingLbl}>🌙 Dark mode</Text>
          <Switch
            value={darkMode}
            onValueChange={async (v) => {
              setDarkMode(v);
              await AsyncStorage.setItem('oto_dark_mode', String(v));
            }}
            trackColor={{ false: '#e8ecf0', true: '#ff6b00' }}
            thumbColor="#fff"
          />
        </View>
        <TouchableOpacity style={s.settingItem} onPress={handleGroqKey}>
          <Text style={s.settingLbl}>🤖 Groq API key</Text>
          <Text style={[s.settingArrow, groqKey && { color: '#16a34a' }]}>
            {groqKey ? '✅ Set →' : 'Not set →'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.settingItem, { borderBottomWidth: 0 }]} onPress={handleClearHistory}>
          <Text style={s.settingLbl}>🗑️ Clear local history</Text>
          <Text style={[s.settingArrow, { color: '#dc2626' }]}>Clear →</Text>
        </TouchableOpacity>
      </View>

      {/* App info */}
      <View style={s.appInfo}>
        <Text style={s.appInfoTxt}>OTO-Mech v1.0.0 · Firebase: oto-mech</Text>
        <Text style={s.appInfoTxt}>Model: 4-class audio classifier · Chat: llama-3.3-70b</Text>
        <Text style={s.appInfoTxt}>Bundle: com.otomech.app · Project: dcced985</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  topBar: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8ecf0',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0d1117' },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 0, borderRadius: 16, padding: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9aa3b0',
    letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff6b00',
    alignItems: 'center', justifyContent: 'center',
  },
  accountName: { fontSize: 15, fontWeight: '700', color: '#0d1117' },
  accountEmail: { fontSize: 12, color: '#9aa3b0', marginTop: 2 },
  logoutBtn: {
    borderWidth: 1, borderColor: '#e8ecf0', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  logoutTxt: { fontSize: 12, color: '#5b6880' },
  anonCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  anonAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8ecf0',
    alignItems: 'center', justifyContent: 'center',
  },
  anonName: { fontSize: 15, fontWeight: '700', color: '#0d1117' },
  anonSub: { fontSize: 12, color: '#9aa3b0', marginTop: 2 },
  signUpBtn: {
    backgroundColor: '#ff6b00', borderRadius: 40, padding: 14,
    alignItems: 'center', marginTop: 12,
  },
  signUpTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon: { fontSize: 28 },
  vehicleName: { fontSize: 15, fontWeight: '700', color: '#0d1117' },
  vehicleSub: { fontSize: 12, color: '#9aa3b0', marginTop: 2 },
  editBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#f4f5f7',
    borderWidth: 1, borderColor: '#e8ecf0', alignItems: 'center', justifyContent: 'center',
  },
  vehicleForm: { gap: 4 },
  formLabel: { fontSize: 10, fontWeight: '700', color: '#9aa3b0', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: '#f4f5f7', borderWidth: 1.5, borderColor: '#e8ecf0',
    borderRadius: 12, padding: 12, fontSize: 14, color: '#0d1117', marginBottom: 12,
  },
  makeChip: {
    backgroundColor: '#f4f5f7', borderWidth: 1.5, borderColor: '#e8ecf0',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  makeChipActive: { backgroundColor: '#ff6b00', borderColor: '#ff6b00' },
  makeChipTxt: { fontSize: 13, fontWeight: '600', color: '#5b6880' },
  makeChipTxtActive: { color: '#fff' },
  settingsList: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#e8ecf0',
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e8ecf0',
  },
  settingLbl: { fontSize: 14, color: '#0d1117' },
  settingArrow: { fontSize: 13, color: '#9aa3b0' },
  appInfo: { padding: 20, alignItems: 'center', gap: 4 },
  appInfoTxt: { fontSize: 11, color: '#9aa3b0', textAlign: 'center' },
});
